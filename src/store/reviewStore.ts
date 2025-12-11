import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { Review, FilterOptions, Comment, ErrorDetails } from '../types'
import { reviewService } from '../services/reviewService'
import { cacheManager } from '../services/cacheManager'

interface ReviewStoreState {
  reviews: Review[]
  selectedReview: Review | null
  filters: FilterOptions
  loading: boolean
  error: ErrorDetails | null
  lastFetchTime: number | null
  cacheVersion: number
}

interface ReviewStoreActions {
  setReviews: (reviews: Review[]) => void
  setSelectedReview: (review: Review | null) => void
  addReview: (review: Review) => void
  updateReview: (id: string, updates: Partial<Review>) => Promise<void>
  removeReview: (id: string) => void
  setFilters: (filters: FilterOptions) => void
  clearFilters: () => void
  fetchReviews: (options?: FilterOptions, force?: boolean) => Promise<void>
  fetchReview: (id: string, force?: boolean) => Promise<Review | null>
  addComment: (reviewId: string, comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'replies' | 'reactions'>) => Promise<void>
  updateComment: (reviewId: string, commentId: string, updates: Partial<Comment>) => Promise<void>
  invalidateCache: (reviewId?: string) => void
}

type ReviewStore = ReviewStoreState & ReviewStoreActions

const initialState: ReviewStoreState = {
  reviews: [],
  selectedReview: null,
  filters: {},
  loading: false,
  error: null,
  lastFetchTime: null,
  cacheVersion: 1,
}

export const useReviewStore = create<ReviewStore>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,
        
        setReviews: (reviews) => {
          set({ reviews, lastFetchTime: Date.now() }, false, 'setReviews')
          cacheManager.set('reviews', reviews, { ttl: 300000 }).catch(() => {})
        },

        setSelectedReview: (selectedReview) => {
          set({ selectedReview }, false, 'setSelectedReview')
          if (selectedReview) {
            cacheManager.set(`review:${selectedReview.id}`, selectedReview, { ttl: 600000 }).catch(() => {})
          }
        },

        addReview: (review) => {
          set((state) => {
            const newReviews = [review, ...state.reviews]
            cacheManager.set('reviews', newReviews, { ttl: 300000 }).catch(() => {})
            return { reviews: newReviews }
          }, false, 'addReview')
        },

        updateReview: async (id, updates) => {
          try {
            const updatedReview = await reviewService.updateReview(id, updates)
            set((state) => {
              const newReviews = state.reviews.map((r) => 
                r.id === id ? updatedReview : r
              )
              const newSelected = state.selectedReview?.id === id 
                ? updatedReview 
                : state.selectedReview

              cacheManager.set('reviews', newReviews, { ttl: 300000 }).catch(() => {})
              cacheManager.set(`review:${id}`, updatedReview, { ttl: 600000 }).catch(() => {})

              return {
                reviews: newReviews,
                selectedReview: newSelected,
              }
            }, false, 'updateReview')
          } catch (error) {
            const errorDetails: ErrorDetails = {
              code: 'UPDATE_REVIEW_ERROR',
              message: error instanceof Error ? error.message : 'Failed to update review',
              timestamp: new Date(),
            }
            set({ error: errorDetails }, false, 'updateReview:error')
            throw error
          }
        },

        removeReview: (id) => {
          set((state) => {
            const newReviews = state.reviews.filter((r) => r.id !== id)
            cacheManager.delete(`review:${id}`)
            cacheManager.set('reviews', newReviews, { ttl: 300000 }).catch(() => {})
            return {
              reviews: newReviews,
              selectedReview: state.selectedReview?.id === id ? null : state.selectedReview,
            }
          }, false, 'removeReview')
        },

        setFilters: (filters) => {
          set({ filters }, false, 'setFilters')
        },

        clearFilters: () => {
          set({ filters: {} }, false, 'clearFilters')
        },

        fetchReviews: async (options, force = false) => {
          const state = get()
          const cacheKey = `reviews:${JSON.stringify(options || state.filters)}`
          
          if (!force) {
            const cached = await cacheManager.getAsync<Review[]>(cacheKey)
            if (cached) {
              set({ reviews: cached, loading: false }, false, 'fetchReviews:cached')
              return
            }
          }

          set({ loading: true, error: null }, false, 'fetchReviews:start')
          
          try {
            const reviews = await reviewService.getReviews(options || state.filters)
            await cacheManager.set(cacheKey, reviews, { ttl: 300000 })
            const currentState = get()
            if (currentState.filters === (options || state.filters)) {
              set({ 
                reviews, 
                loading: false, 
                lastFetchTime: Date.now() 
              }, false, 'fetchReviews:success')
            }
          } catch (error) {
            const errorDetails: ErrorDetails = {
              code: 'FETCH_REVIEWS_ERROR',
              message: error instanceof Error ? error.message : 'Failed to fetch reviews',
              timestamp: new Date(),
              context: { options, force },
            }
            set({ 
              error: errorDetails, 
              loading: false 
            }, false, 'fetchReviews:error')
          }
        },

        fetchReview: async (id, force = false) => {
          const cacheKey = `review:${id}`
          
          if (!force) {
            const cached = await cacheManager.getAsync<Review>(cacheKey)
            if (cached) {
              set({ selectedReview: cached, loading: false }, false, 'fetchReview:cached')
              return cached
            }
          }

          set({ loading: true, error: null }, false, 'fetchReview:start')
          
          try {
            const review = await reviewService.getReview(id)
            await cacheManager.set(cacheKey, review, { ttl: 600000 })
            set({ 
              selectedReview: review, 
              loading: false 
            }, false, 'fetchReview:success')
            return review
          } catch (error) {
            const errorDetails: ErrorDetails = {
              code: 'FETCH_REVIEW_ERROR',
              message: error instanceof Error ? error.message : 'Failed to fetch review',
              timestamp: new Date(),
              context: { id, force },
            }
            set({ 
              error: errorDetails, 
              loading: false 
            }, false, 'fetchReview:error')
            return null
          }
        },

        addComment: async (reviewId, comment) => {
          try {
            const newComment = await reviewService.addComment(reviewId, comment)
            set((state) => {
              const updatedReview = state.reviews.find(r => r.id === reviewId)
              if (updatedReview) {
                const newReview = {
                  ...updatedReview,
                  comments: [...updatedReview.comments, newComment],
                }
                const newReviews = state.reviews.map(r => r.id === reviewId ? newReview : r)
                cacheManager.delete(`review:${reviewId}`)
                return {
                  reviews: newReviews,
                  selectedReview: state.selectedReview?.id === reviewId ? newReview : state.selectedReview,
                }
              }
              return state
            }, false, 'addComment')
          } catch (error) {
            throw error
          }
        },

        updateComment: async (reviewId, commentId, updates) => {
          try {
            const updatedComment = await reviewService.updateComment(reviewId, commentId, updates)
            set((state) => {
              const updateComments = (comments: Comment[]): Comment[] => {
                return comments.map(c => {
                  if (c.id === commentId) {
                    return updatedComment
                  }
                  if (c.replies.length > 0) {
                    return { ...c, replies: updateComments(c.replies) }
                  }
                  return c
                })
              }

              const updatedReview = state.reviews.find(r => r.id === reviewId)
              if (updatedReview) {
                const newReview = {
                  ...updatedReview,
                  comments: updateComments(updatedReview.comments),
                }
                const newReviews = state.reviews.map(r => r.id === reviewId ? newReview : r)
                cacheManager.delete(`review:${reviewId}`)
                return {
                  reviews: newReviews,
                  selectedReview: state.selectedReview?.id === reviewId ? newReview : state.selectedReview,
                }
              }
              return state
            }, false, 'updateComment')
          } catch (error) {
            throw error
          }
        },

        invalidateCache: (reviewId) => {
          if (reviewId) {
            cacheManager.delete(`review:${reviewId}`)
          } else {
            cacheManager.clear()
          }
          set({ cacheVersion: get().cacheVersion + 1 }, false, 'invalidateCache')
        },
      })),
      {
        name: 'review-store',
        partialize: (state) => ({
          reviews: state.reviews,
          filters: state.filters,
          cacheVersion: state.cacheVersion,
        }),
      }
    ),
    { name: 'ReviewStore' }
  )
)
