import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useReview } from '../contexts/ReviewContext'
import { useAuth } from '../contexts/AuthContext'
import CodeViewer from '../components/CodeViewer'
import CommentThread from '../components/CommentThread'
import { formatDistanceToNow } from 'date-fns'
import './ReviewDetail.css'

const ReviewDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { currentReview, loading, fetchReview, addComment, updateComment } = useReview()
  const { user } = useAuth()
  const [newComment, setNewComment] = useState('')
  const [selectedFile, setSelectedFile] = useState(0)
  const [selectedLine, setSelectedLine] = useState<number | null>(null)

  useEffect(() => {
    if (id) {
      fetchReview(id)
    }
  }, [id, fetchReview])

  const handleAddComment = async () => {
    if (!id || !newComment.trim() || !user) return

    await addComment(id, {
      authorId: user.id,
      content: newComment,
      lineNumber: selectedLine || undefined,
      filePath: currentReview?.files[selectedFile]?.path,
      resolved: false,
    })

    setNewComment('')
    setSelectedLine(null)
  }

  const handleReply = async (parentId: string, content: string) => {
    if (!id || !user) return
    await addComment(id, {
      authorId: user.id,
      content,
      resolved: false,
    })
  }

  const handleUpdateComment = async (commentId: string, content: string) => {
    if (!id) return
    await updateComment(id, commentId, { content })
  }

  const handleResolve = async (commentId: string, resolved: boolean) => {
    if (!id) return
    await updateComment(id, commentId, { resolved })
  }

  if (loading) {
    return <div className="review-detail-loading">Loading review...</div>
  }

  if (!currentReview) {
    return <div className="review-detail-error">Review not found</div>
  }

  return (
    <div className="review-detail">
      <div className="review-detail-header">
        <h1>{currentReview.title}</h1>
        <div className="review-detail-meta">
          <span className="status-badge">{currentReview.status}</span>
          <span className="priority-badge">{currentReview.priority}</span>
          <span className="date">
            Updated {formatDistanceToNow(currentReview.updatedAt, { addSuffix: true })}
          </span>
        </div>
      </div>
      <p className="review-detail-description">{currentReview.description}</p>
      <div className="review-detail-content">
        <div className="review-files">
          <div className="file-tabs">
            {currentReview.files.map((file, index) => (
              <button
                key={file.id}
                className={`file-tab ${selectedFile === index ? 'active' : ''}`}
                onClick={() => setSelectedFile(index)}
              >
                {file.path.split('/').pop()}
              </button>
            ))}
          </div>
          {currentReview.files[selectedFile] && (
            <CodeViewer
              file={currentReview.files[selectedFile]}
              onLineClick={setSelectedLine}
              selectedLines={
                currentReview.comments
                  .filter((c) => c.filePath === currentReview.files[selectedFile]?.path && c.lineNumber)
                  .map((c) => c.lineNumber!)
              }
            />
          )}
        </div>
        <div className="review-comments-section">
          <h2>Comments</h2>
          <div className="comments-list">
            {currentReview.comments
              .filter((c) => !c.lineNumber)
              .map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onUpdate={handleUpdateComment}
                  onResolve={handleResolve}
                  currentUserId={user?.id || ''}
                />
              ))}
          </div>
          <div className="new-comment">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="comment-input"
            />
            {selectedLine && (
              <p className="comment-line-info">Commenting on line {selectedLine}</p>
            )}
            <button onClick={handleAddComment} className="submit-comment-btn">
              Add Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReviewDetail

