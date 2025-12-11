import { useEffect, useState, useMemo } from 'react'
import { useReview } from '../contexts/ReviewContext'
import { useAuth } from '../contexts/AuthContext'
import ReviewCard from '../components/ReviewCard'
import FilterPanel from '../components/FilterPanel'
import { useDebounce } from '../hooks/useDebounce'
import './Dashboard.css'

const Dashboard: React.FC = () => {
  const { reviews, loading, error, fetchReviews, filters } = useReview()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase()
        return (
          review.title.toLowerCase().includes(query) ||
          review.description.toLowerCase().includes(query) ||
          review.tags.some((tag) => tag.toLowerCase().includes(query))
        )
      }
      return true
    })
  }, [reviews, debouncedSearchQuery])

  if (loading && reviews.length === 0) {
    return <div className="dashboard-loading">Loading reviews...</div>
  }

  if (error) {
    return <div className="dashboard-error">Error: {error.message}</div>
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Code Reviews</h1>
        {user && <p className="welcome-text">Welcome back, {user.username}</p>}
      </div>
      <div className="dashboard-content">
        <div className="dashboard-sidebar">
          <FilterPanel />
        </div>
        <div className="dashboard-main">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <span className="results-count">
              {filteredReviews.length} {filteredReviews.length === 1 ? 'review' : 'reviews'}
            </span>
          </div>
          <div className="reviews-list">
            {filteredReviews.length === 0 ? (
              <div className="empty-state">
                <p>No reviews found</p>
              </div>
            ) : (
              filteredReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
