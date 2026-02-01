import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AuthCallback from './pages/AuthCallback'
import MeetPage from './pages/MeetPage'
import PrejoinPage from './pages/PrejoinPage'
import RoomPage from './pages/RoomPage'
import { SERVER_URL } from './config'

function App() {
  // ✅ FIXED: Keep backend alive to prevent cold starts (Render free tier)
  useEffect(() => {
    // Ping backend every 10 minutes to keep it awake
    const keepAlive = setInterval(async () => {
      try {
        await fetch(`${SERVER_URL}/health`)
        console.log('✅ Backend kept alive')
      } catch (error) {
        console.log('⚠️ Backend unreachable:', error.message)
      }
    }, 10 * 60 * 1000) // Every 10 minutes
    
    // Initial ping
    fetch(`${SERVER_URL}/health`).catch(() => {})
    
    return () => clearInterval(keepAlive)
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/meet" element={<MeetPage />} />
        <Route path="/prejoin" element={<PrejoinPage />} />
        <Route path="/room/:roomCode" element={<PrejoinPage />} />
        <Route path="/call" element={<RoomPage />} />
        <Route path="/room-call" element={<RoomPage />} />
      </Routes>
    </Router>
  )
}

export default App
