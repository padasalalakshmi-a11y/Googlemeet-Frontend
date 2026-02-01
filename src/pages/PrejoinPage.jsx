import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import { SERVER_URL, LANGUAGES } from '../config'

export default function PrejoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const params = useParams()
  
  // Get room code from URL params or search params
  const roomCode = params.roomCode || searchParams.get('room')
  
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '')
  const [speakingLanguage, setSpeakingLanguage] = useState(localStorage.getItem('speakingLanguage') || 'en')
  const [receiveLanguage, setReceiveLanguage] = useState(localStorage.getItem('receiveLanguage') || 'te')
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [stream, setStream] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authChecking, setAuthChecking] = useState(true)
  
  const videoRef = useRef(null)

  // Check authentication and credits first
  useEffect(() => {
    const checkAuthAndCredits = () => {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      
      // Check if user is logged in
      if (!token || !userData) {
        // Save the room code to redirect back after login
        sessionStorage.setItem('redirectAfterLogin', `/room/${roomCode}`)
        navigate(`/login?redirect=/room/${roomCode}`)
        return
      }
      
      // Check if user has credits
      const user = JSON.parse(userData)
      if (!user.credits || user.credits <= 0) {
        setError('⚠️ You need credits to join this meeting. Please purchase credits first.')
        setAuthChecking(false)
        return
      }
      
      // All checks passed
      setAuthChecking(false)
    }
    
    if (roomCode) {
      checkAuthAndCredits()
    }
  }, [roomCode, navigate])

  useEffect(() => {
    if (!roomCode) {
      navigate('/meet')
      return
    }
    
    // Don't start media until auth check is complete
    if (authChecking) {
      return
    }

    // SKIP CAMERA PREVIEW - Don't get user media on prejoin page
    // This prevents "Device in use" errors when navigating to room page
    // Camera will start in the room page instead
    
    console.log('⏭️ Skipping camera preview on prejoin page to prevent conflicts')

    return () => {
      // Cleanup (nothing to clean since we're not starting camera)
      console.log('🧹 Prejoin cleanup (no camera to stop)')
    }
  }, [roomCode, navigate, authChecking])

  const handleJoinRoom = () => {
    if (!userName.trim()) {
      setError('Please enter your name')
      return
    }
    
    // Double-check credits before joining
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      if (!user.credits || user.credits <= 0) {
        setError('⚠️ You need credits to join this meeting. Please purchase credits first.')
        return
      }
    } else {
      navigate('/login')
      return
    }

    // Show loading state
    setLoading(true)
    setError('')

    // Save preferences
    localStorage.setItem('userName', userName)
    localStorage.setItem('speakingLanguage', speakingLanguage)
    localStorage.setItem('receiveLanguage', receiveLanguage)

    // Save to sessionStorage for room page
    sessionStorage.setItem('userName', userName)
    sessionStorage.setItem('speakingLanguage', speakingLanguage)
    sessionStorage.setItem('receiveLanguage', receiveLanguage)
    sessionStorage.setItem('roomCode', roomCode)

    // CRITICAL: Stop preview stream BEFORE navigating
    console.log('🛑 Stopping prejoin stream before joining room...')
    
    // Stop all tracks from the stream
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop()
        console.log(`  ✅ Stopped ${track.kind} track`)
      })
      setStream(null)
    }
    
    // Also stop tracks from video element (belt and suspenders)
    if (videoRef.current && videoRef.current.srcObject) {
      const videoStream = videoRef.current.srcObject
      videoStream.getTracks().forEach(track => {
        track.stop()
        console.log(`  ✅ Stopped ${track.kind} track from video element`)
      })
      videoRef.current.srcObject = null
    }

    // Longer delay to ensure tracks are fully released (2000ms for reliability)
    console.log('⏳ Waiting 2000ms for device cleanup...')
    setTimeout(() => {
      console.log('✅ Navigating to room page...')
      navigate(`/room-call?room=${roomCode}`)
    }, 2000)
  }

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setVideoEnabled(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setAudioEnabled(audioTrack.enabled)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <Navbar />
      
      {/* Loading State */}
      {authChecking && (
        <div className="pt-24 pb-12 px-4 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl text-gray-600">Checking authentication...</p>
          </div>
        </div>
      )}
      
      {/* No Credits Error */}
      {!authChecking && error && error.includes('credits') && (
        <div className="pt-24 pb-12 px-4">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl p-8 text-center"
            >
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Insufficient Credits
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                You need credits to join this meeting.
              </p>
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
                <p className="text-yellow-800 font-semibold">
                  {error}
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/dashboard')}
                  className="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-shadow"
                >
                  Buy Credits
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/')}
                  className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                >
                  Go Home
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
      
      {/* Main Content - Only show if auth passed */}
      {!authChecking && (!error || !error.includes('credits')) && (
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
              Ready to Join?
            </h1>
            <p className="text-xl text-gray-600">
              Room: <span className="font-mono font-bold text-primary">{roomCode}</span>
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Video Preview */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-xl p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Video Preview</h2>
              
              <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center text-white">
                      <div className="text-6xl mb-2">📹</div>
                      <p>Camera Off</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleVideo}
                  className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                    videoEnabled
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {videoEnabled ? '📹 Camera On' : '📹 Camera Off'}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleAudio}
                  className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                    audioEnabled
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {audioEnabled ? '🎤 Mic On' : '🎤 Mic Off'}
                </motion.button>
              </div>
            </motion.div>

            {/* Settings Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-xl p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Settings</h2>
              
              <div className="space-y-6">
                {/* Name Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                {/* Speaking Language */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    I speak
                  </label>
                  <select
                    value={speakingLanguage}
                    onChange={(e) => setSpeakingLanguage(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors text-base"
                    required
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.nativeName}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Language you will speak in</p>
                </div>

                {/* Receiving Language */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Transulate to see in Transulation box
                  </label>
                  <select
                    value={receiveLanguage}
                    onChange={(e) => setReceiveLanguage(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors text-base"
                    required
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.nativeName}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Language you want translations in</p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* Join Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleJoinRoom}
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Joining...' : 'Join Meeting'}
                </motion.button>

                <button
                  onClick={() => navigate('/meet')}
                  className="w-full py-3 text-gray-600 hover:text-gray-900 font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">💡</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Before you join:</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• Make sure your camera and microphone are working</li>
                  <li>• Choose the language you speak and want to hear</li>
                  <li>• You can change settings anytime during the call</li>
                  <li>• Click the 💬 button in the call to enable translation</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
