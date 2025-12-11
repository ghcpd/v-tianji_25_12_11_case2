import { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Layout.css'

interface LayoutProps {
  children: ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            CodeReview
          </Link>
          <nav className="nav">
            {isAuthenticated ? (
              <>
                <Link to="/" className="nav-link">Dashboard</Link>
                <Link to="/create" className="nav-link">New Review</Link>
                <Link to="/profile" className="nav-link">Profile</Link>
                <div className="user-menu">
                  <span className="username">{user?.username}</span>
                  <button onClick={handleLogout} className="logout-btn">
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <Link to="/login" className="nav-link">Login</Link>
            )}
          </nav>
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

export default Layout
