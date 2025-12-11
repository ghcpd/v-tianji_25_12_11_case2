import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import { Review, FilterOptions, Comment, ReviewFile, PaginatedResponse, ApiResponse, ErrorDetails } from '../types'
import { cacheManager } from './cacheManager'
import { errorHandler } from './errorHandler'

class ReviewService {
  private api: AxiosInstance
  private baseURL: string = '/api/reviews'
  private requestQueue: Map<string, Promise<AxiosResponse>> = new Map()
  private retryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
  }

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        const requestId = this.generateRequestId()
        config.metadata = { requestId, startTime: performance.now() }

        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    this.api.interceptors.response.use(
      (response) => {
        if (response.headers['etag']) {
          const cacheKey = this.getCacheKey(response.config)
          if (cacheKey) {
            cacheManager.set(cacheKey, response.data, {
              ttl: this.getCacheTTL(response),
            }).catch(console.error)
          }
        }

        return response
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

        if (this.shouldRetry(error, originalRequest)) {
          return this.retryRequest(originalRequest, error)
        }

        const errorDetails = errorHandler.handle(error)
        return Promise.reject(errorDetails)
      }
    )
  }

  private shouldRetry(error: AxiosError, config?: AxiosRequestConfig): boolean {
    if (!config || config._retry) {
      return false
    }

    const status = error.response?.status
    if (!status) {
      return false
    }

    return this.retryConfig.retryableStatuses.includes(status)
  }

  private async retryRequest(
    config: AxiosRequestConfig,
    error: AxiosError
  ): Promise<AxiosResponse> {
    config._retry = true

    const retryCount = (config as any).retryCount || 0
    if (retryCount >= this.retryConfig.maxRetries) {
      throw error
    }

    ;(config as any).retryCount = retryCount + 1

    const delay = this.retryConfig.retryDelay * Math.pow(2, retryCount)
    await new Promise(resolve => setTimeout(resolve, delay))

    return this.api.request(config)
  }

  private getCacheKey(config: AxiosRequestConfig): string | null {
    if (!config.url) return null
    const params = config.params ? `:${JSON.stringify(config.params)}` : ''
    return `${config.method}:${config.url}${params}`
  }

  private getCacheTTL(response: AxiosResponse): number {
    const cacheControl = response.headers['cache-control']
    if (cacheControl) {
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/)
      if (maxAgeMatch) {
        return parseInt(maxAgeMatch[1]) * 1000
      }
    }
    return 300000
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async requestWithDeduplication<T>(
    key: string,
    requestFn: () => Promise<AxiosResponse<T>>
  ): Promise<AxiosResponse<T>> {
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key)! as Promise<AxiosResponse<T>>
    }

    const promise = requestFn().finally(() => {
      this.requestQueue.delete(key)
    })

    this.requestQueue.set(key, promise)
    return promise
  }

  async getReviews(filters?: FilterOptions): Promise<Review[]> {
    const cacheKey = `reviews:${JSON.stringify(filters)}`
    const cached = await cacheManager.getAsync<Review[]>(cacheKey)
    if (cached) {
      return cached
    }

    const requestKey = `getReviews:${JSON.stringify(filters)}`
    const response = await this.requestWithDeduplication(requestKey, () =>
      this.api.get<Review[]>('', { params: filters })
    )

    const reviews = response.data.map(this.transformReview)
    await cacheManager.set(cacheKey, reviews, { ttl: 300000 })
    return reviews
  }

  async getReview(id: string): Promise<Review> {
    const cacheKey = `review:${id}`
    const cached = await cacheManager.getAsync<Review>(cacheKey)
    if (cached) {
      return cached
    }

    const response = await this.api.get<Review>(`/${id}`)
    const review = this.transformReview(response.data)
    await cacheManager.set(cacheKey, review, { ttl: 600000 })
    return review
  }

  async getReviewsPaginated(
    page: number = 1,
    pageSize: number = 20,
    filters?: FilterOptions
  ): Promise<PaginatedResponse<Review>> {
    const response = await this.api.get<PaginatedResponse<Review>>('/paginated', {
      params: { page, pageSize, ...filters },
    })

    return {
      ...response.data,
      items: response.data.items.map(this.transformReview),
    }
  }

  async createReview(review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<Review> {
    const response = await this.api.post<Review>('', review)
    const newReview = this.transformReview(response.data)
    
    await cacheManager.delete('reviews:{}')
    return newReview
  }

  async updateReview(id: string, updates: Partial<Review>): Promise<Review> {
    const response = await this.api.patch<Review>(`/${id}`, updates)
    const updatedReview = this.transformReview(response.data)
    
    await cacheManager.delete(`review:${id}`)
    await cacheManager.delete('reviews:{}')
    return updatedReview
  }

  async deleteReview(id: string): Promise<void> {
    await this.api.delete(`/${id}`)
    await cacheManager.delete(`review:${id}`)
    await cacheManager.delete('reviews:{}')
  }

  async addComment(
    reviewId: string,
    comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'replies' | 'reactions'>
  ): Promise<Comment> {
    const response = await this.api.post<Comment>(`/${reviewId}/comments`, comment)
    const newComment = this.transformComment(response.data)
    
    await cacheManager.delete(`review:${reviewId}`)
    return newComment
  }

  async updateComment(
    reviewId: string,
    commentId: string,
    updates: Partial<Comment>
  ): Promise<Comment> {
    const response = await this.api.patch<Comment>(
      `/${reviewId}/comments/${commentId}`,
      updates
    )
    const updatedComment = this.transformComment(response.data)
    
    await cacheManager.delete(`review:${reviewId}`)
    return updatedComment
  }

  async deleteComment(reviewId: string, commentId: string): Promise<void> {
    await this.api.delete(`/${reviewId}/comments/${commentId}`)
    await cacheManager.delete(`review:${reviewId}`)
  }

  async addFile(reviewId: string, file: ReviewFile): Promise<void> {
    await this.api.post(`/${reviewId}/files`, file)
    await cacheManager.delete(`review:${reviewId}`)
  }

  async removeFile(reviewId: string, fileId: string): Promise<void> {
    await this.api.delete(`/${reviewId}/files/${fileId}`)
    await cacheManager.delete(`review:${reviewId}`)
  }

  private transformReview(data: any): Review {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      mergedAt: data.mergedAt ? new Date(data.mergedAt) : undefined,
      closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
      comments: data.comments?.map(this.transformComment) || [],
      files: data.files || [],
    }
  }

  private transformComment(data: any): Comment {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      replies: data.replies?.map(this.transformComment) || [],
      reactions: data.reactions || [],
    }
  }
}

export const reviewService = new ReviewService()
