import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReview } from '../contexts/ReviewContext'
import { useAuth } from '../contexts/AuthContext'
import { Review } from '../types'
import './CreateReview.css'

const CreateReview: React.FC = () => {
  const navigate = useNavigate()
  const { createReview } = useReview()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Review['priority']>('medium')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [files, setFiles] = useState<Array<{ path: string; content: string; language: string }>>([])

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleAddFile = () => {
    setFiles([...files, { path: '', content: '', language: 'javascript' }])
  }

  const handleFileChange = (index: number, field: string, value: string) => {
    const newFiles = [...files]
    newFiles[index] = { ...newFiles[index], [field]: value }
    setFiles(newFiles)
  }

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim()) return

    try {
      const newReview = await createReview({
        title,
        description,
        authorId: user.id,
        status: 'draft',
        priority,
        tags,
        files: files.map((f, i) => ({
          id: `file-${i}`,
          path: f.path,
          content: f.content,
          language: f.language,
        })),
        comments: [],
        participants: [user.id],
      })

      navigate(`/review/${newReview.id}`)
    } catch (error) {
      console.error('Failed to create review:', error)
    }
  }

  return (
    <div className="create-review">
      <h1>Create New Review</h1>
      <form onSubmit={handleSubmit} className="review-form">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-textarea"
            rows={5}
          />
        </div>
        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Review['priority'])}
            className="form-select"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="form-group">
          <label>Tags</label>
          <div className="tag-input-group">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="Add a tag..."
              className="form-input"
            />
            <button type="button" onClick={handleAddTag} className="add-tag-btn">
              Add
            </button>
          </div>
          <div className="tags-list">
            {tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="tag-remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Files</label>
          {files.map((file, index) => (
            <div key={index} className="file-input-group">
              <input
                type="text"
                placeholder="File path"
                value={file.path}
                onChange={(e) => handleFileChange(index, 'path', e.target.value)}
                className="form-input"
              />
              <select
                value={file.language}
                onChange={(e) => handleFileChange(index, 'language', e.target.value)}
                className="form-select"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="css">CSS</option>
              </select>
              <textarea
                placeholder="File content"
                value={file.content}
                onChange={(e) => handleFileChange(index, 'content', e.target.value)}
                className="form-textarea"
                rows={10}
              />
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="remove-file-btn"
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={handleAddFile} className="add-file-btn">
            Add File
          </button>
        </div>
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/')} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" className="submit-btn">
            Create Review
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateReview

