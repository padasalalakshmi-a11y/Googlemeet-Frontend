import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import MeetPage from './pages/MeetPage'
import PrejoinPage from './pages/PrejoinPage'
import RoomPage from './pages/RoomPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
