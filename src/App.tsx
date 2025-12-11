import { Routes, Route } from 'react-router-dom'
import { ReviewProvider } from './contexts/ReviewContext'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ReviewDetail from './pages/ReviewDetail'
import CreateReview from './pages/CreateReview'
import Profile from './pages/Profile'

function App() {
  const useStore = localStorage.getItem('useZustand') === 'true'
  
  return (
    <AuthProvider>
      <ReviewProvider useStore={useStore}>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/review/:id" element={<ReviewDetail />} />
            <Route path="/create" element={<CreateReview />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Layout>
      </ReviewProvider>
    </AuthProvider>
  )
}

export default App
