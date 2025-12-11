import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { Review, FilterOptions, Comment, ErrorDetails } from '../types'
import { reviewService } from '../services/reviewService'
import { useReviewStore } from '../store/reviewStore'
import { cacheManager } from '../services/cacheManager'

interface ReviewContextType {
  reviews: Review[]
  currentReview: Review | null
  filters: FilterOptions
  loading: boolean
  error: ErrorDetails | null
  fetchReviews: (options?: FilterOptions) => Promise<void>
  fetchReview: (id: string) => Promise<void>
  createReview: (review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Review>
  updateReview: (id: string, updates: Partial<Review>) => Promise<void>
  deleteReview: (id: string) => Promise<void>
  addComment: (reviewId: string, comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'replies' | 'reactions'>) => Promise<void>
  updateComment: (reviewId: string, commentId: string, updates: Partial<Comment>) => Promise<void>
  setFilters: (filters: FilterOptions) => void
  clearFilters: () => void
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined)

export const useReview = () => {
  const context = useContext(ReviewContext)
  if (!context) {
    throw new Error('useReview must be used within ReviewProvider')
  }
  return context
}

interface ReviewProviderProps {
  children: ReactNode
  useStore?: boolean
}

export const ReviewProvider: React.FC<ReviewProviderProps> = ({ 
  children, 
  useStore = false 
}) => {
  const store = useReviewStore()
  const [localReviews, setLocalReviews] = useState<Review[]>([])
  const [currentReview, setCurrentReview] = useState<Review | null>(null)
  const [filters, setFiltersState] = useState<FilterOptions>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ErrorDetails | null>(null)

  const reviews = useStore ? store.reviews : localReviews

  useEffect(() => {
    if (useStore) {
      const unsubscribe = useReviewStore.subscribe(
        (state) => state.reviews,
        (reviews) => {
          setLocalReviews(reviews)
        },
        { equalityFn: (a, b) => a.length === b.length }
      )
      return unsubscribe
    }
  }, [useStore])

  const fetchReviews = useCallback(async (options?: FilterOptions) => {
    const cacheKey = `reviews:${JSON.stringify(options || filters)}`
    
    if (useStore) {
      await store.fetchReviews(options || filters, false)
    } else {
      setLoading(true)
      setError(null)

      try {
        const cached = await cacheManager.getAsync<Review[]>(cacheKey)
        if (cached) {
          setLocalReviews(cached)
          setLoading(false)
          return
        }

        const fetchedReviews = await reviewService.getReviews(options || filters)
        await cacheManager.set(cacheKey, fetchedReviews, { ttl: 300000 })
        setLocalReviews(fetchedReviews)
      } catch (err) {
        const errorDetails: ErrorDetails = {
          code: 'FETCH_REVIEWS_ERROR',
          message: err instanceof Error ? err.message : 'Failed to fetch reviews',
          timestamp: new Date(),
        }
        setError(errorDetails)
      } finally {
        setLoading(false)
      }
    }
  }, [filters, useStore, store])

  const fetchReview = useCallback(async (id: string) => {
    const cacheKey = `review:${id}`
    
    if (useStore) {
      await store.fetchReview(id, false)
      setCurrentReview(store.selectedReview)
    } else {
      setLoading(true)
      setError(null)

      try {
        const cached = await cacheManager.getAsync<Review>(cacheKey)
        if (cached) {
          setCurrentReview(cached)
          setLoading(false)
          return
        }

        const review = await reviewService.getReview(id)
        await cacheManager.set(cacheKey, review, { ttl: 600000 })
        setCurrentReview(review)
      } catch (err) {
        const errorDetails: ErrorDetails = {
          code: 'FETCH_REVIEW_ERROR',
          message: err instanceof Error ? err.message : 'Failed to fetch review',
          timestamp: new Date(),
        }
        setError(errorDetails)
      } finally {
        setLoading(false)
      }
    }
  }, [useStore, store])

  const createReview = useCallback(async (reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true)
    setError(null)

    try {
      const newReview = await reviewService.createReview(reviewData)
      
      if (useStore) {
        store.addReview(newReview)
      } else {
        setLocalReviews(prev => [newReview, ...prev])
        await cacheManager.delete('reviews:{}')
      }

      return newReview
    } catch (err) {
      const errorDetails: ErrorDetails = {
        code: 'CREATE_REVIEW_ERROR',
        message: err instanceof Error ? err.message : 'Failed to create review',
        timestamp: new Date(),
      }
      setError(errorDetails)
      throw err
    } finally {
      setLoading(false)
    }
  }, [useStore, store])

  const updateReview = useCallback(async (id: string, updates: Partial<Review>) => {
    setLoading(true)
    setError(null)

    try {
      if (useStore) {
        await store.updateReview(id, updates)
      } else {
        const updatedReview = await reviewService.updateReview(id, updates)
        setLocalReviews(prev => prev.map(r => r.id === id ? updatedReview : r))
        if (currentReview?.id === id) {
          setCurrentReview(updatedReview)
        }
        cacheManager.delete(`review:${id}`)
        const cacheKey = `reviews:${JSON.stringify(filters)}`
        cacheManager.delete(cacheKey)
      }
    } catch (err) {
      const errorDetails: ErrorDetails = {
        code: 'UPDATE_REVIEW_ERROR',
        message: err instanceof Error ? err.message : 'Failed to update review',
        timestamp: new Date(),
      }
      setError(errorDetails)
    } finally {
      setLoading(false)
    }
  }, [currentReview, useStore, store, filters])

  const deleteReview = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      await reviewService.deleteReview(id)
      
      if (useStore) {
        store.removeReview(id)
      } else {
        setLocalReviews(prev => prev.filter(r => r.id !== id))
        await cacheManager.delete(`review:${id}`)
        await cacheManager.delete('reviews:{}')
      }

      if (currentReview?.id === id) {
        setCurrentReview(null)
      }
    } catch (err) {
      const errorDetails: ErrorDetails = {
        code: 'DELETE_REVIEW_ERROR',
        message: err instanceof Error ? err.message : 'Failed to delete review',
        timestamp: new Date(),
      }
      setError(errorDetails)
    } finally {
      setLoading(false)
    }
  }, [currentReview, useStore, store])

  const addComment = useCallback(async (reviewId: string, comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'replies' | 'reactions'>) => {
    setLoading(true)
    setError(null)

    try {
      if (useStore) {
        await store.addComment(reviewId, comment)
      } else {
        const newComment = await reviewService.addComment(reviewId, comment)
        setLocalReviews(prev => prev.map(r => 
          r.id === reviewId 
            ? { ...r, comments: [...r.comments, newComment] }
            : r
        ))
        if (currentReview?.id === reviewId) {
          setCurrentReview(prev => prev ? { ...prev, comments: [...prev.comments, newComment] } : null)
        }
        await cacheManager.delete(`review:${reviewId}`)
      }
    } catch (err) {
      const errorDetails: ErrorDetails = {
        code: 'ADD_COMMENT_ERROR',
        message: err instanceof Error ? err.message : 'Failed to add comment',
        timestamp: new Date(),
      }
      setError(errorDetails)
    } finally {
      setLoading(false)
    }
  }, [currentReview, useStore, store])

  const updateComment = useCallback(async (reviewId: string, commentId: string, updates: Partial<Comment>) => {
    setLoading(true)
    setError(null)

    try {
      if (useStore) {
        await store.updateComment(reviewId, commentId, updates)
      } else {
        const updatedComment = await reviewService.updateComment(reviewId, commentId, updates)
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

        setLocalReviews(prev => prev.map(r => 
          r.id === reviewId 
            ? { ...r, comments: updateComments(r.comments) }
            : r
        ))
        if (currentReview?.id === reviewId) {
          setCurrentReview(prev => prev ? {
            ...prev,
            comments: updateComments(prev.comments)
          } : null)
        }
        await cacheManager.delete(`review:${reviewId}`)
      }
    } catch (err) {
      const errorDetails: ErrorDetails = {
        code: 'UPDATE_COMMENT_ERROR',
        message: err instanceof Error ? err.message : 'Failed to update comment',
        timestamp: new Date(),
      }
      setError(errorDetails)
    } finally {
      setLoading(false)
    }
  }, [currentReview, useStore, store])

  const setFilters = useCallback((newFilters: FilterOptions) => {
    setFiltersState(newFilters)
    if (useStore) {
      store.setFilters(newFilters)
    }
  }, [useStore, store])

  const clearFilters = useCallback(() => {
    setFiltersState({})
    if (useStore) {
      store.clearFilters()
    }
  }, [useStore, store])

  return (
    <ReviewContext.Provider
      value={{
        reviews,
        currentReview,
        filters,
        loading,
        error,
        fetchReviews,
        fetchReview,
        createReview,
        updateReview,
        deleteReview,
        addComment,
        updateComment,
        setFilters,
        clearFilters,
      }}
    >
      {children}
    </ReviewContext.Provider>
  )
}
