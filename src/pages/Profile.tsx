import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './Profile.css'

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth()
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      await updateUser({ username, email })
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  if (!user) {
    return <div className="profile-error">Please log in to view your profile</div>
  }

  return (
    <div className="profile">
      <h1>Profile</h1>
      <div className="profile-content">
        <div className="profile-info">
          <div className="profile-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} />
            ) : (
              <div className="avatar-placeholder">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-details">
            <p className="profile-role">Role: {user.role}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
            />
          </div>
          <button type="submit" className="submit-btn">
            Update Profile
          </button>
        </form>
      </div>
    </div>
  )
}

export default Profile

