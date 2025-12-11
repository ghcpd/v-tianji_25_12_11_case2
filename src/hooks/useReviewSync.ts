import { useEffect } from 'react'
import { useReviewStore } from '../store/reviewStore'
import { useReview } from '../contexts/ReviewContext'

export function useReviewSync() {
  const store = useReviewStore()
  const context = useReview()

  useEffect(() => {
    const interval = setInterval(() => {
      if (store.reviews.length !== context.reviews.length) {
        context.fetchReviews()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [store.reviews.length, context.reviews.length, context])
}

