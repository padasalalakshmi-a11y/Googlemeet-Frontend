import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import { useWebRTC, globalStreamManager } from '../hooks/useWebRTC'
import { useGoogleSpeechVAD } from '../hooks/useGoogleSpeechVAD'
import { LANGUAGES } from '../config'
import DebugPanel from '../components/DebugPanel'

export default function RoomPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const roomCode = searchParams.get('room')
  
  const userName = sessionStorage.getItem('userName')
  const speakingLanguage = sessionStorage.getItem('speakingLanguage')
  const receiveLanguage = sessionStorage.getItem('receiveLanguage')

  // Get language names
  const getLanguageName = (code) => {
    const lang = LANGUAGES.find(l => l.code === code)
    return lang ? lang.nativeName : code
  }

  const { socket, isConnected } = useSocket()
  const { localStream, remoteStreams, cameraError, createOffer, handleOffer, handleAnswer, handleIceCandidate, removePeer, peersRef } = useWebRTC(socket, roomCode)
  
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false)
  const [showTranscriptionPanel, setShowTranscriptionPanel] = useState(false)
  const [subtitles, setSubtitles] = useState(new Map())
  const [transcriptions, setTranscriptions] = useState([])
  
  // Credit system states
  const [credits, setCredits] = useState(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [showCreditWarning, setShowCreditWarning] = useState(false)
  const [showOutOfCreditsModal, setShowOutOfCreditsModal] = useState(false)
  const [creditsUsedThisSession, setCreditsUsedThisSession] = useState(0)
  const [showTranslationConfirmModal, setShowTranslationConfirmModal] = useState(false) // NEW: Confirmation modal

  // ✅ Screen sharing states
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenStream, setScreenStream] = useState(null)
  
  // ✅ Emoji reaction states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [reactions, setReactions] = useState([])

  const localVideoRef = useRef(null)
  
  // ✅ Emoji list
  const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '🔥']
  
  // Speech recognition (Google Cloud Speech-to-Text with VAD)
  const {
    transcript,
    isListening,
    isSpeaking,
    isProcessing,
    startListening,
    stopListening,
    resetTranscript
  } = useGoogleSpeechVAD(speakingLanguage)

  // Redirect if no session data
  useEffect(() => {
    if (!roomCode || !userName || !speakingLanguage || !receiveLanguage) {
      navigate(`/prejoin?room=${roomCode || ''}`)
    }
  }, [roomCode, userName, speakingLanguage, receiveLanguage, navigate])

  // Set local video
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  // Set up socket listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleExistingUsers = (users) => {
      console.log('👥 Existing users in room:', users.length);
      users.forEach(user => {
        console.log('📞 Initiating connection to existing user:', user.userId);
        createOffer(user.userId);
      });
    };

    const handleUserJoined = ({ userId }) => {
      console.log('👤 New user joined:', userId, '- They will initiate connection to us');
    };

    const handleOfferReceived = ({ offer, from }) => {
      handleOffer(offer, from);
    };

    const handleAnswerReceived = ({ answer, from }) => {
      handleAnswer(answer, from);
    };

    const handleIceCandidateReceived = ({ candidate, from }) => {
      handleIceCandidate(candidate, from);
    };

    const handleUserLeft = ({ userId }) => {
      removePeer(userId);
    };

    const handleTranslatedText = ({ original, translated, from }) => {
      setShowTranscriptionPanel(true)
      
      setSubtitles(prev => {
        const newMap = new Map(prev);
        newMap.set(from, translated);
        return newMap;
      });
      
      setTimeout(() => {
        setSubtitles(prev => {
          const newMap = new Map(prev);
          newMap.delete(from);
          return newMap;
        });
      }, 5000);

      setTranscriptions(prev => [...prev, { original, translated, from }].slice(-20));
    };

    // Credit system socket listeners
    const handleTranslationSessionStarted = ({ credits, message }) => {
      console.log('✅ Translation session started:', message);
      setCredits(credits);
      setSessionActive(true);
      setCreditsUsedThisSession(0);
    };

    const handleCreditUpdate = ({ credits, used }) => {
      console.log(`💳 Credits updated: ${credits} (used this session: ${used})`);
      setCredits(credits);
      setCreditsUsedThisSession(used);
    };

    const handleLowCreditsWarning = ({ credits, message }) => {
      console.log(`⚠️ Low credits warning: ${message}`);
      setCredits(credits);
      setShowCreditWarning(true);
      
      // Auto-hide warning after 5 seconds
      setTimeout(() => setShowCreditWarning(false), 5000);
    };

    const handleCreditsDepleted = ({ message }) => {
      console.log(`❌ Credits depleted: ${message}`);
      setCredits(0);
      setSessionActive(false);
      setShowOutOfCreditsModal(true);
      
      // Stop translation
      if (isListening) {
        stopListening();
        setTranscriptionEnabled(false);
      }
    };

    const handleTranslationSessionEnded = ({ creditsUsed, credits, message }) => {
      console.log(`✅ Translation session ended: ${message}`);
      console.log(`   Credits used: ${creditsUsed}`);
      setCredits(credits);
      setSessionActive(false);
      setCreditsUsedThisSession(0);
    };

    const handleInsufficientCredits = ({ message, credits }) => {
      console.log(`❌ Insufficient credits: ${message}`);
      setCredits(credits);
      setShowOutOfCreditsModal(true);
    };

    const handleTranslationError = ({ message }) => {
      console.error(`❌ Translation error: ${message}`);
      setSessionActive(false);
    };

    // ✅ Emoji reaction handler
    const handleEmojiReaction = ({ emoji, reactionId, from }) => {
      const newReaction = {
        id: reactionId,
        emoji,
        x: Math.random() * 80 + 10,
        y: 100,
        userId: from
      }
      setReactions(prev => [...prev, newReaction])
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== reactionId))
      }, 3000)
    };

    socket.on('existing-users', handleExistingUsers);
    socket.on('user-joined', handleUserJoined);
    socket.on('offer', handleOfferReceived);
    socket.on('answer', handleAnswerReceived);
    socket.on('ice-candidate', handleIceCandidateReceived);
    socket.on('user-left', handleUserLeft);
    socket.on('translated-text', handleTranslatedText);
    
    // Credit system events
    socket.on('translation-session-started', handleTranslationSessionStarted);
    socket.on('credit-update', handleCreditUpdate);
    socket.on('low-credits-warning', handleLowCreditsWarning);
    socket.on('credits-depleted', handleCreditsDepleted);
    socket.on('translation-session-ended', handleTranslationSessionEnded);
    socket.on('insufficient-credits', handleInsufficientCredits);
    socket.on('translation-error', handleTranslationError);
    
    // ✅ Emoji reaction event
    socket.on('emoji-reaction', handleEmojiReaction);

    return () => {
      socket.off('existing-users', handleExistingUsers);
      socket.off('user-joined', handleUserJoined);
      socket.off('offer', handleOfferReceived);
      socket.off('answer', handleAnswerReceived);
      socket.off('ice-candidate', handleIceCandidateReceived);
      socket.off('user-left', handleUserLeft);
      socket.off('translated-text', handleTranslatedText);
      
      // Credit system events
      socket.off('translation-session-started', handleTranslationSessionStarted);
      socket.off('credit-update', handleCreditUpdate);
      socket.off('low-credits-warning', handleLowCreditsWarning);
      socket.off('credits-depleted', handleCreditsDepleted);
      socket.off('translation-session-ended', handleTranslationSessionEnded);
      socket.off('insufficient-credits', handleInsufficientCredits);
      socket.off('translation-error', handleTranslationError);
      
      // ✅ Emoji reaction cleanup
      socket.off('emoji-reaction', handleEmojiReaction);
    };
  }, [socket, isConnected, createOffer, handleOffer, handleAnswer, handleIceCandidate, removePeer, isListening, stopListening]);

  // Join room - ✅ FIXED: Don't wait for localStream to avoid race condition
  useEffect(() => {
    if (socket && isConnected && roomCode && userName) {
      console.log('🚪 Joining room:', roomCode)
      socket.emit('join-room', {
        roomCode,
        userName,
        language: receiveLanguage,
        speakingLanguage
      });
    }
  }, [socket, isConnected, roomCode, userName, receiveLanguage, speakingLanguage])

  // Handle transcription
  useEffect(() => {
    if (transcript && socket) {
      console.log('🎤 Sending transcription:', transcript)
      console.log('   Room:', roomCode)
      console.log('   Language:', speakingLanguage)
      console.log('   Socket connected:', socket.connected)
      
      socket.emit('transcription', {
        roomCode,
        text: transcript,
        language: speakingLanguage
      })
      
      console.log('✅ Transcription sent to backend')
      resetTranscript()
    }
  }, [transcript, socket, roomCode, speakingLanguage, resetTranscript])

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        if (videoEnabled) {
          // Turn OFF camera - ✅ PROPERLY STOP THE ORIGINAL STREAM
          console.log('📹 Stopping camera completely...')
          
          // Stop the cloned stream tracks
          localStream.getVideoTracks().forEach(track => {
            track.stop()
            console.log('🛑 Stopped cloned video track:', track.id)
          })
          
          // ✅ CRITICAL: Force stop the original stream in GlobalStreamManager
          globalStreamManager.forceStopOriginalStream()
          
          setVideoEnabled(false)
          console.log('✅ Camera turned OFF - Light should be OFF now!')
        } else {
          // Turn ON camera - Get completely new stream
          console.log('📹 Requesting new camera access...')
          navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: false 
          })
            .then(newStream => {
              const newVideoTrack = newStream.getVideoTracks()[0]
              
              console.log('✅ Got new video track:', newVideoTrack.id)
              
              // Remove all old video tracks
              localStream.getVideoTracks().forEach(track => {
                localStream.removeTrack(track)
                console.log('🗑️ Removed old video track')
              })
              
              // Add new video track
              localStream.addTrack(newVideoTrack)
              console.log('➕ Added new video track')
              
              // Update video element
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStream
                console.log('🎥 Updated video element')
              }
              
              // Update all peer connections with new video track
              if (peersRef?.current) {
                peersRef.current.forEach((peer, peerId) => {
                  const sender = peer.getSenders().find(s => s.track?.kind === 'video')
                  if (sender) {
                    sender.replaceTrack(newVideoTrack)
                      .then(() => console.log('✅ Video track updated for peer:', peerId))
                      .catch(err => console.error('❌ Failed to update peer:', err))
                  }
                })
              }
              
              setVideoEnabled(true)
              console.log('✅ Camera turned ON')
            })
            .catch(error => {
              console.error('❌ Failed to turn on camera:', error)
              if (error.name === 'NotAllowedError') {
                alert('Camera permission denied. Please allow camera access.')
              } else if (error.name === 'NotFoundError') {
                alert('No camera found. Please connect a camera.')
              } else {
                alert('Failed to turn on camera: ' + error.message)
              }
            })
        }
      }
    }
  }

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        const newState = !audioTrack.enabled
        audioTrack.enabled = newState
        setAudioEnabled(newState)
        console.log('🎤 Audio toggled:', newState ? 'ON' : 'OFF')
        
        // ✅ FIXED: Don't interfere with speech recognition
        // Speech recognition and audio track are independent
        // User can mute mic for call but still use translation
      }
    }
  }

  const toggleTranscription = () => {
    // Toggle Voice Activity Detection mode
    if (isListening) {
      console.log('⏹️ Stopping VAD mode')
      stopListening()
      setTranscriptionEnabled(false)
      
      // Emit translation-stopped event
      if (socket && sessionActive) {
        console.log('📡 Emitting translation-stopped event')
        socket.emit('translation-stopped')
      }
    } else {
      // Check if user is authenticated
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      
      if (!token || !userData) {
        alert('⚠️ Please login to use translation feature')
        navigate('/login')
        return
      }
      
      const user = JSON.parse(userData)
      
      // Check if user has credits (show warning if 0)
      if (credits === 0) {
        setShowOutOfCreditsModal(true)
        return
      }
      
      // NEW: Show confirmation modal before starting
      setShowTranslationConfirmModal(true)
    }
  }
  
  // NEW: Start translation after confirmation
  const startTranslationConfirmed = () => {
    const user = JSON.parse(localStorage.getItem('user'))
    
    console.log('🎙️ Starting VAD mode - speak anytime!')
    startListening()
    setTranscriptionEnabled(true)
    setShowTranscriptionPanel(true)
    setShowTranslationConfirmModal(false)
    
    // Emit translation-started event
    if (socket) {
      console.log('📡 Emitting translation-started event')
      socket.emit('translation-started', {
        roomCode,
        userId: user.id
      })
    }
  }

  // ✅ Screen Sharing Function
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop())
        setScreenStream(null)
      }
      setIsScreenSharing(false)
      
      if (socket) {
        socket.emit('screen-share-stopped', { roomCode })
      }
    } else {
      // Start screen sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: false
        })
        
        setScreenStream(stream)
        setIsScreenSharing(true)
        
        // Handle when user stops sharing via browser button
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false)
          setScreenStream(null)
          if (socket) {
            socket.emit('screen-share-stopped', { roomCode })
          }
        }
        
        if (socket) {
          socket.emit('screen-share-started', { roomCode, userId: socket.id })
        }
        
        console.log('✅ Screen sharing started')
      } catch (error) {
        console.error('❌ Screen share error:', error)
        if (error.name === 'NotAllowedError') {
          alert('Screen sharing permission denied')
        } else {
          alert('Failed to start screen sharing')
        }
      }
    }
  }

  // ✅ Emoji Reaction Function
  const sendEmoji = (emoji) => {
    const reactionId = Date.now()
    const newReaction = {
      id: reactionId,
      emoji,
      x: Math.random() * 80 + 10,
      y: 100,
      userId: 'local'
    }
    
    setReactions(prev => [...prev, newReaction])
    
    if (socket) {
      socket.emit('emoji-reaction', { roomCode, emoji, reactionId })
    }
    
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reactionId))
    }, 3000)
    
    setShowEmojiPicker(false)
  }

  const leaveCall = () => {
    // Stop translation session if active
    if (socket && sessionActive) {
      console.log('📡 Stopping translation session before leaving')
      socket.emit('translation-stopped')
    }
    
    // Stop screen sharing if active
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop())
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    if (socket) {
      socket.disconnect()
    }
    sessionStorage.clear()
    navigate('/')
  }

  return (
    <div className="h-screen flex flex-col bg-[#202124] text-white overflow-hidden">
      {/* Debug Panel for Mobile */}
      <DebugPanel />
      
      {/* Low Credits Warning Banner */}
      {showCreditWarning && credits !== null && credits <= 10 && credits > 0 && (
        <div className="fixed top-4 right-4 bg-yellow-500 text-black px-6 py-4 rounded-lg shadow-2xl z-50 flex items-center gap-3 animate-bounce border-2 border-yellow-600">
          <span className="text-3xl">⚠️</span>
          <div>
            <p className="font-bold text-lg">Low Credits!</p>
            <p className="text-sm">You have {credits} credits remaining</p>
          </div>
          <button 
            onClick={() => setShowCreditWarning(false)}
            className="ml-4 text-black hover:text-gray-700 font-bold text-2xl"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Out of Credits Modal */}
      {showOutOfCreditsModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-[#16213e] rounded-2xl p-8 max-w-md w-full border-2 border-[#e94560]">
            <div className="text-center">
              <div className="text-6xl mb-4">💳</div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Out of Credits!
              </h2>
              <p className="text-gray-300 mb-2 text-lg">
                You've used all your translation credits.
              </p>
              <p className="text-gray-400 mb-6">
                Purchase more credits to continue using real-time translation.
              </p>
              
              {/* Credit Packages */}
              <div className="bg-[#0f3460] rounded-xl p-4 mb-6 text-left">
                <p className="text-[#00d4ff] font-bold mb-2">💰 Credit Packages:</p>
                <div className="space-y-1 text-sm text-gray-300">
                  <p>• 100 credits = $10 ($0.10/min)</p>
                  <p>• 500 credits = $40 ($0.08/min) - 20% off</p>
                  <p>• 1000 credits = $70 ($0.07/min) - 30% off</p>
                  <p>• 5000 credits = $300 ($0.06/min) - 40% off</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowOutOfCreditsModal(false)
                    navigate('/dashboard')
                  }}
                  className="flex-1 bg-[#00d4ff] hover:bg-[#00b8e6] text-black px-6 py-3 rounded-lg font-bold transition-all"
                >
                  Buy Credits
                </button>
                <button
                  onClick={() => setShowOutOfCreditsModal(false)}
                  className="flex-1 bg-[#0f3460] hover:bg-[#1a4d7a] text-white px-6 py-3 rounded-lg font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* NEW: Translation Confirmation Modal */}
      {showTranslationConfirmModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-[#202124] rounded-2xl p-8 max-w-lg w-full border-2 border-[#1a73e8] shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">🌐</div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Start Real-Time Translation?
              </h2>
              
              {/* Key Information */}
              <div className="bg-[#3c4043] rounded-xl p-5 mb-6 text-left space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <p className="text-white font-semibold">Credits Will Be Used</p>
                    <p className="text-gray-300 text-sm">~1 credit per minute of speaking</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎤</span>
                  <div>
                    <p className="text-white font-semibold">Your Speech Will Be Translated</p>
                    <p className="text-gray-300 text-sm">From {getLanguageName(speakingLanguage)} to {getLanguageName(receiveLanguage)}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-2xl">👥</span>
                  <div>
                    <p className="text-white font-semibold">Others Will See Translation</p>
                    <p className="text-gray-300 text-sm">Your translated speech appears as subtitles</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⏱️</span>
                  <div>
                    <p className="text-white font-semibold">Stop Anytime</p>
                    <p className="text-gray-300 text-sm">Click the button again to stop using credits</p>
                  </div>
                </div>
              </div>
              
              {/* Current Credits Display */}
              <div className="bg-[#1a73e8]/20 border border-[#1a73e8] rounded-lg p-4 mb-6">
                <p className="text-white text-lg">
                  <span className="font-bold text-[#1a73e8]">Your Balance:</span> {credits} credits
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  ≈ {credits} minutes of translation
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTranslationConfirmModal(false)}
                  className="flex-1 bg-[#3c4043] hover:bg-[#4c5053] text-white px-6 py-3 rounded-lg font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={startTranslationConfirmed}
                  className="flex-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white px-6 py-3 rounded-lg font-bold transition-all"
                >
                  Start Translation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Camera Error Modal */}
      {cameraError && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#16213e] rounded-2xl p-8 max-w-md w-full border-2 border-[#e94560]">
            <div className="text-center">
              <div className="text-6xl mb-4">
                {cameraError === 'CAMERA_IN_USE' && '⚠️'}
                {cameraError === 'PERMISSION_DENIED' && '🚫'}
                {cameraError === 'DEVICE_NOT_FOUND' && '📹'}
                {cameraError.includes('Retrying') && '⏳'}
                {!['CAMERA_IN_USE', 'PERMISSION_DENIED', 'DEVICE_NOT_FOUND'].includes(cameraError) && !cameraError.includes('Retrying') && '❌'}
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-4">
                {cameraError === 'CAMERA_IN_USE' && 'Camera Already in Use'}
                {cameraError === 'PERMISSION_DENIED' && 'Permission Denied'}
                {cameraError === 'DEVICE_NOT_FOUND' && 'No Camera Found'}
                {cameraError.includes('Retrying') && 'Connecting to Camera...'}
                {!['CAMERA_IN_USE', 'PERMISSION_DENIED', 'DEVICE_NOT_FOUND'].includes(cameraError) && !cameraError.includes('Retrying') && 'Camera Error'}
              </h2>
              
              <p className="text-gray-300 mb-6">
                {cameraError === 'CAMERA_IN_USE' && (
                  <>
                    Your camera is being used by another tab or application.
                    <br /><br />
                    <strong className="text-[#00d4ff]">Solutions:</strong>
                    <br />• Close other tabs using the camera
                    <br />• Close other video apps (Zoom, Teams, etc.)
                    <br />• Refresh this page after closing them
                  </>
                )}
                {cameraError === 'PERMISSION_DENIED' && (
                  <>
                    Please allow camera and microphone access to join the meeting.
                    <br /><br />
                    Click the camera icon in your browser's address bar to grant permissions.
                  </>
                )}
                {cameraError === 'DEVICE_NOT_FOUND' && (
                  <>
                    No camera or microphone detected.
                    <br /><br />
                    Please connect a camera/microphone and refresh the page.
                  </>
                )}
                {cameraError.includes('Retrying') && (
                  <>
                    {cameraError}
                    <br /><br />
                    Please wait while we try to connect to your camera...
                  </>
                )}
              </p>
              
              {!cameraError.includes('Retrying') && (
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-[#00d4ff] hover:bg-[#00b8e6] text-black px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    Refresh Page
                  </button>
                  <button
                    onClick={leaveCall}
                    className="bg-[#e94560] hover:bg-[#d63447] text-white px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    Leave Meeting
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Header - Google Meet Style */}
      <div className="bg-[#202124] px-6 py-3 flex justify-between items-center border-b border-[#3c4043]">
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-medium text-white">Room: {roomCode}</span>
          <span className="text-xs text-gray-400">
            {getLanguageName(speakingLanguage)} → {getLanguageName(receiveLanguage)}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Credit Display */}
          {credits !== null && (
            <div className="flex items-center gap-2 bg-[#3c4043] px-3 py-1.5 rounded-full">
              <span className="text-lg">💳</span>
              <div className="flex flex-col">
                <span className="text-white font-medium text-sm">{credits} credits</span>
                {sessionActive && creditsUsedThisSession > 0 && (
                  <span className="text-xs text-gray-400">Used: {creditsUsedThisSession}</span>
                )}
              </div>
            </div>
          )}
          
          <button 
            onClick={leaveCall}
            className="bg-transparent hover:bg-[#3c4043] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Video Grid - Google Meet Style */}
      <div className="flex-1 grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-2 p-2 overflow-y-auto bg-[#202124]">
        {/* Local Video */}
        <div className="relative bg-[#3c4043] rounded-lg overflow-hidden aspect-video">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!videoEnabled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#3c4043] gap-2">
              <div className="text-5xl">📹</div>
              <p className="text-white text-sm">Camera Off</p>
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-md text-xs font-medium">
            You
          </div>
        </div>

        {/* ✅ Screen Share Video */}
        {isScreenSharing && screenStream && (
          <div className="relative bg-[#3c4043] rounded-lg overflow-hidden aspect-video col-span-2">
            <video
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
              ref={(video) => {
                if (video && screenStream) {
                  video.srcObject = screenStream
                }
              }}
            />
            <div className="absolute top-3 left-3 bg-[#ea4335] px-3 py-1 rounded-md text-xs font-medium flex items-center gap-2">
              <span className="animate-pulse">🔴</span>
              <span>Presenting</span>
            </div>
          </div>
        )}

        {/* Remote Videos */}
        {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
          <RemoteVideo
            key={userId}
            stream={stream}
            subtitle={subtitles.get(userId)}
          />
        ))}
      </div>

      {/* Controls - Google Meet Style with Tooltips */}
      <div className="bg-[#202124] px-5 py-4 flex justify-center gap-3 border-t border-[#3c4043]">
        {/* Video Button */}
        <div className="relative group">
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:bg-[#3c4043] ${
              videoEnabled 
                ? 'bg-[#3c4043] text-white' 
                : 'bg-[#ea4335] text-white'
            }`}
            title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              {videoEnabled ? (
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              ) : (
                <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
              )}
            </svg>
          </button>
        </div>

        {/* Mic Button */}
        <button
          onClick={toggleAudio}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:bg-[#3c4043] ${
            audioEnabled 
              ? 'bg-[#3c4043] text-white' 
              : 'bg-[#ea4335] text-white'
          }`}
          title="Toggle Microphone"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            {audioEnabled ? (
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z M17.3 11c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            ) : (
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
            )}
          </svg>
        </button>

        {/* Translation Button */}
        <div className="relative">
          <button
            onClick={toggleTranscription}
            disabled={isProcessing || credits === 0}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all relative ${
              isListening 
                ? 'bg-[#1a73e8] text-white' 
                : credits === 0
                ? 'bg-[#3c4043] text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-[#3c4043] text-white hover:bg-[#4c5053]'
            } ${isProcessing || credits === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={
              credits === 0 
                ? 'No credits available' 
                : isProcessing 
                ? 'Processing...' 
                : isListening 
                ? 'Stop Translation (Using Credits)' 
                : 'Start Translation (Uses Credits)'
            }
          >
            {/* Globe with Languages Icon - Clear Translation Symbol */}
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            {isListening && !isProcessing && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSpeaking ? 'bg-green-400' : 'bg-blue-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isSpeaking ? 'bg-green-500' : 'bg-blue-500'}`}></span>
              </span>
            )}
          </button>
          
          {/* Credit Cost Badge - Shows when NOT listening */}
          {!isListening && credits > 0 && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
              💳 Uses Credits
            </div>
          )}
          
          {/* Active Badge - Shows when listening */}
          {isListening && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg animate-pulse">
              🔴 LIVE
            </div>
          )}
        </div>

        {/* Captions/Panel Button */}
        <button
          onClick={() => setShowTranscriptionPanel(!showTranscriptionPanel)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            showTranscriptionPanel 
              ? 'bg-[#1a73e8] text-white' 
              : 'bg-[#3c4043] text-white hover:bg-[#4c5053]'
          }`}
          title="Show/Hide Translation Panel"
        >
          {/* Chat Bubble Icon - Clear Panel/Messages Symbol */}
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            <path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/>
          </svg>
        </button>

        {/* Screen Share Button */}
        <button
          onClick={toggleScreenShare}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isScreenSharing 
              ? 'bg-[#1a73e8] text-white' 
              : 'bg-[#3c4043] text-white hover:bg-[#4c5053]'
          }`}
          title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        >
          {/* Monitor/Desktop Icon - Clear Screen Share Symbol */}
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            {isScreenSharing ? (
              /* Stop Sharing - Monitor with X */
              <>
                <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
                <path d="M14.59 8L12 10.59 9.41 8 8 9.41 10.59 12 8 14.59 9.41 16 12 13.41 14.59 16 16 14.59 13.41 12 16 9.41z"/>
              </>
            ) : (
              /* Start Sharing - Monitor with Arrow */
              <>
                <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
                <path d="M12 7l-4 4h3v4h2v-4h3z"/>
              </>
            )}
          </svg>
        </button>

        {/* Emoji Reaction Button */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              showEmojiPicker 
                ? 'bg-[#1a73e8] text-white' 
                : 'bg-[#3c4043] text-white hover:bg-[#4c5053]'
            }`}
            title="Send Reaction"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
          </button>
          
          {/* Horizontal Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#202124] rounded-full px-3 py-2 shadow-2xl border border-[#3c4043] z-50">
              <div className="flex gap-1">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => sendEmoji(emoji)}
                    className="text-3xl hover:scale-125 transition-transform p-2 hover:bg-[#3c4043] rounded-full w-12 h-12 flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Leave Button */}
        <button
          onClick={leaveCall}
          className="w-14 h-14 rounded-full bg-[#ea4335] text-white flex items-center justify-center transition-all hover:bg-[#d33426]"
          title="Leave Call"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
          </svg>
        </button>
      </div>

      {/* ✅ Emoji Reactions Overlay */}
      <div className="fixed inset-0 pointer-events-none z-40">
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute text-6xl animate-float-up"
            style={{
              left: `${reaction.x}%`,
              bottom: '0%',
              animation: 'floatUp 3s ease-out forwards'
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      {/* Transcription Panel - matching room.css */}
      <div 
        className={`fixed top-0 bottom-0 w-[350px] bg-[#16213e] p-5 overflow-y-auto border-l-2 border-[#0f3460] z-[1000] transition-all duration-300 ${
          showTranscriptionPanel ? 'right-0' : '-right-[350px]'
        }`}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-[#00d4ff] text-xl font-bold">Live Transcription</h3>
          <button
            onClick={() => setShowTranscriptionPanel(false)}
            className="text-white hover:text-[#e94560] text-2xl"
            title="Close Panel"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {transcriptions.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              <p className="mb-2">No translations yet</p>
              <p className="text-sm">Click 💬 Translate button and start speaking</p>
            </div>
          ) : (
            transcriptions.map((item, index) => (
              <div 
                key={index} 
                className="bg-[#0f3460] p-4 rounded-lg border-l-[3px] border-[#00d4ff]"
              >
                <div className="text-gray-400 text-[13px] mb-2">Original: {item.original}</div>
                <div className="text-white text-[15px] font-medium">{item.translated}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function RemoteVideo({ stream, subtitle }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
      console.log('✅ Remote video stream set:', stream.id)
    }
  }, [stream])

  return (
    <div className="relative bg-[#3c4043] rounded-lg overflow-hidden aspect-video">
      <video
        ref={videoRef}
        autoPlay
        muted={false}
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-md text-xs font-medium">
        Remote User
      </div>
      {subtitle && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/90 px-4 py-2 rounded-lg text-sm max-w-[80%] text-center">
          {subtitle}
        </div>
      )}
    </div>
  )
}
