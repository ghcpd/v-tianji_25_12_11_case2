import { useState } from 'react'
import { Comment } from '../types'
import { formatDistanceToNow } from 'date-fns'
import './CommentThread.css'

interface CommentThreadProps {
  comment: Comment
  onReply: (parentId: string, content: string) => void
  onUpdate: (commentId: string, content: string) => void
  onResolve: (commentId: string, resolved: boolean) => void
  currentUserId: string
}

const CommentThread: React.FC<CommentThreadProps> = ({
  comment,
  onReply,
  onUpdate,
  onResolve,
  currentUserId,
}) => {
  const [isReplying, setIsReplying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [editContent, setEditContent] = useState(comment.content)

  const handleReply = () => {
    if (replyContent.trim()) {
      onReply(comment.id, replyContent)
      setReplyContent('')
      setIsReplying(false)
    }
  }

  const handleUpdate = () => {
    if (editContent.trim()) {
      onUpdate(comment.id, editContent)
      setIsEditing(false)
    }
  }

  const canEdit = comment.authorId === currentUserId

  return (
    <div className={`comment-thread ${comment.resolved ? 'resolved' : ''}`}>
      <div className="comment">
        <div className="comment-header">
          <span className="comment-author">User {comment.authorId}</span>
          <span className="comment-date">
            {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
          </span>
          {comment.lineNumber && (
            <span className="comment-location">
              Line {comment.lineNumber}
            </span>
          )}
        </div>
        {isEditing ? (
          <div className="comment-edit">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="comment-edit-input"
            />
            <div className="comment-edit-actions">
              <button onClick={handleUpdate} className="save-btn">
                Save
              </button>
              <button onClick={() => setIsEditing(false)} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="comment-content">{comment.content}</div>
        )}
        <div className="comment-actions">
          {canEdit && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="action-btn">
              Edit
            </button>
          )}
          <button
            onClick={() => onResolve(comment.id, !comment.resolved)}
            className="action-btn"
          >
            {comment.resolved ? 'Unresolve' : 'Resolve'}
          </button>
          <button onClick={() => setIsReplying(!isReplying)} className="action-btn">
            Reply
          </button>
        </div>
        {isReplying && (
          <div className="comment-reply">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="reply-input"
            />
            <div className="reply-actions">
              <button onClick={handleReply} className="reply-btn">
                Post Reply
              </button>
              <button onClick={() => setIsReplying(false)} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      {comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onUpdate={onUpdate}
              onResolve={onResolve}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CommentThread

