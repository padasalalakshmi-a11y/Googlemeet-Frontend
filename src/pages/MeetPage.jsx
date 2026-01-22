import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import { SERVER_URL } from '../config'

export default function MeetPage() {
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [meetingLink, setMeetingLink] = useState('')
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const generateRoomCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz'
    const segments = []
    for (let i = 0; i < 3; i++) {
      let segment = ''
      for (let j = 0; j < 3 + i; j++) {
        segment += chars[Math.floor(Math.random() * chars.length)]
      }
      segments.push(segment)
    }
    return segments.join('-')
  }

  const createMeeting = async (joinImmediately = false) => {
    setCreateLoading(true)
    setError('')
    setShowDropdown(false)
    
    try {
      const newRoomCode = generateRoomCode()
      
      // Create room in backend
      const response = await fetch(`${SERVER_URL}/api/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: newRoomCode })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (joinImmediately) {
          // Join immediately
          navigate(`/room/${newRoomCode}`)
        } else {
          // Show modal with link (Google Meet style URL)
          const link = `${window.location.origin}/room/${newRoomCode}`
          setMeetingLink(link)
          setShowModal(true)
          setCreateLoading(false)
        }
      } else {
        setError(data.message || 'Failed to create meeting. Please try again.')
        setCreateLoading(false)
      }
    } catch (err) {
      console.error('Error creating meeting:', err)
      setError('Failed to create meeting. Please check your connection.')
      setCreateLoading(false)
    }
  }

  const handleInstantMeeting = () => {
    createMeeting(true)
  }

  const handleMeetingForLater = () => {
    createMeeting(false)
  }

  const handleScheduleMeeting = () => {
    createMeeting(false)
    // Could add calendar integration here
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(meetingLink)
    // Could add a toast notification here
  }

  const handleJoinMeeting = async () => {
    if (createLoading || joinLoading) return // Prevent if any button is loading
    
    if (!roomCode.trim()) {
      setError('Please enter a room code')
      return
    }

    setJoinLoading(true)
    setError('')

    try {
      // Check if room exists
      const response = await fetch(`${SERVER_URL}/api/rooms/${roomCode}/exists`)
      const data = await response.json()

      if (data.exists) {
        // Navigate immediately (Google Meet style URL)
        navigate(`/room/${roomCode}`)
      } else {
        setError('Room not found. Please check the code.')
        setJoinLoading(false)
      }
    } catch (err) {
      console.error('Error checking room:', err)
      setError('Failed to check room. Please check your connection.')
      setJoinLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Start Your{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Meeting
              </span>
            </h1>
            <p className="text-xl text-gray-600">
              Create a new meeting or join an existing one
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Create Meeting */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🚀</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Create New Meeting
                </h2>
                <p className="text-gray-600">
                  Start a meeting instantly and invite others
                </p>
              </div>

              <div className="relative" ref={dropdownRef}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDropdown(!showDropdown)}
                  disabled={createLoading || joinLoading}
                  className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="text-xl">📹</span>
                  {createLoading ? 'Creating...' : 'New Meeting'}
                  <motion.span
                    animate={{ rotate: showDropdown ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm"
                  >
                    ▼
                  </motion.span>
                </motion.button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"
                    >
                      <button
                        onClick={handleInstantMeeting}
                        className="w-full px-4 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
                      >
                        <span className="text-2xl mt-1">⚡</span>
                        <div>
                          <div className="font-semibold text-gray-900">Start an instant meeting</div>
                          <div className="text-sm text-gray-600">Create a meeting now</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={handleMeetingForLater}
                        className="w-full px-4 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
                      >
                        <span className="text-2xl mt-1">🔗</span>
                        <div>
                          <div className="font-semibold text-gray-900">Create a meeting for later</div>
                          <div className="text-sm text-gray-600">Share the link to meet later</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={handleScheduleMeeting}
                        className="w-full px-4 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="text-2xl mt-1">📅</span>
                        <div>
                          <div className="font-semibold text-gray-900">Schedule in Calendar</div>
                          <div className="text-sm text-gray-600">Pick a date and time</div>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-6 text-center text-sm text-gray-500">
                ✨ No registration required
              </div>
            </motion.div>

            {/* Join Meeting */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-secondary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🔗</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Join Meeting
                </h2>
                <p className="text-gray-600">
                  Enter the meeting code to join
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinMeeting()}
                  placeholder="Enter room code (e.g., abc-defg-hij)"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                />

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleJoinMeeting}
                  disabled={createLoading || joinLoading}
                  className="w-full py-4 bg-gradient-to-r from-secondary to-accent text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joinLoading ? 'Joining...' : 'Join Meeting'}
                </motion.button>
              </div>

              <div className="mt-6 text-center text-sm text-gray-500">
                🔒 Secure and private
              </div>
            </motion.div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 bg-white rounded-2xl shadow-lg p-8"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              What happens next?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">👤</div>
                <h4 className="font-semibold text-gray-900 mb-2">Enter Your Name</h4>
                <p className="text-sm text-gray-600">Set up your profile for the meeting</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🌐</div>
                <h4 className="font-semibold text-gray-900 mb-2">Choose Languages</h4>
                <p className="text-sm text-gray-600">Select speaking and hearing languages</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🎥</div>
                <h4 className="font-semibold text-gray-900 mb-2">Join the Call</h4>
                <p className="text-sm text-gray-600">Start your translated video call</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Meeting Link Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>

              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Here's your joining information
              </h2>
              <p className="text-gray-600 mb-6">
                Send this to people that you want to meet with. Make sure that you save it so that you can use it later, too.
              </p>

              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={meetingLink}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                >
                  📋
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false)
                    const roomCode = meetingLink.split('/room/')[1]
                    navigate(`/room/${roomCode}`)
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:shadow-lg transition-shadow"
                >
                  Join Now
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
