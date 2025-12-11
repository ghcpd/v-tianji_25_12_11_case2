import { Link } from 'react-router-dom'
import { Review } from '../types'
import { formatDistanceToNow } from 'date-fns'
import './ReviewCard.css'

interface ReviewCardProps {
  review: Review
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const statusColors: Record<Review['status'], string> = {
    draft: '#95a5a6',
    open: '#3498db',
    'in-progress': '#f39c12',
    approved: '#27ae60',
    rejected: '#e74c3c',
  }

  const priorityColors: Record<Review['priority'], string> = {
    low: '#95a5a6',
    medium: '#3498db',
    high: '#f39c12',
    critical: '#e74c3c',
  }

  return (
    <Link to={`/review/${review.id}`} className="review-card">
      <div className="review-card-header">
        <h3 className="review-title">{review.title}</h3>
        <div className="review-badges">
          <span
            className="status-badge"
            style={{ backgroundColor: statusColors[review.status] }}
          >
            {review.status}
          </span>
          <span
            className="priority-badge"
            style={{ backgroundColor: priorityColors[review.priority] }}
          >
            {review.priority}
          </span>
        </div>
      </div>
      <p className="review-description">{review.description}</p>
      <div className="review-meta">
        <span className="review-date">
          {formatDistanceToNow(review.updatedAt, { addSuffix: true })}
        </span>
        <span className="review-comments">
          {review.comments.length} comments
        </span>
        {review.tags.length > 0 && (
          <div className="review-tags">
            {review.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

export default ReviewCard

