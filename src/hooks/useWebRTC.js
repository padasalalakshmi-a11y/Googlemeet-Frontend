import { useState, useRef, useEffect, useCallback } from 'react'

// ✅ GLOBAL STREAM MANAGER - Share camera across tabs like Google Meet
class GlobalStreamManager {
  constructor() {
    this.stream = null
    this.refCount = 0
    this.listeners = new Set()
  }

  async getStream() {
    // If stream already exists and is active, clone it for this tab
    if (this.stream && this.stream.active) {
      console.log('♻️ Reusing existing camera stream (like Google Meet)')
      this.refCount++
      return this.stream.clone() // Clone so each tab can control independently
    }

    // No active stream, request new one
    console.log('🎥 Requesting new camera stream...')
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      })
      this.refCount = 1
      console.log('✅ New camera stream obtained')
      return this.stream.clone()
    } catch (error) {
      console.error('❌ Failed to get camera stream:', error)
      throw error
    }
  }

  releaseStream(stream) {
    this.refCount--
    console.log(`🔄 Stream released. Remaining refs: ${this.refCount}`)
    
    // Stop the cloned stream tracks
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }

    // If no more references, stop the original stream
    if (this.refCount <= 0 && this.stream) {
      console.log('🛑 Stopping original camera stream (no more tabs using it)')
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
      this.refCount = 0
    }
  }

  isStreamActive() {
    return this.stream && this.stream.active
  }
}

// Global singleton instance
const globalStreamManager = new GlobalStreamManager()

export function useWebRTC(socket, roomCode) {
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState(new Map())
  const [cameraError, setCameraError] = useState(null)
  const peersRef = useRef(new Map())
  const localStreamRef = useRef(null)
  const pendingCandidatesRef = useRef(new Map()) // Queue for ICE candidates
  const isGettingStreamRef = useRef(false) // Prevent multiple simultaneous requests
  const retryTimeoutRef = useRef(null)

  useEffect(() => {
    // Get local media stream using global manager (shares across tabs)
    const getLocalStream = async (retryCount = 0) => {
      // Prevent multiple simultaneous requests
      if (isGettingStreamRef.current) {
        console.log('⚠️ Stream request already in progress, skipping...')
        return
      }
      
      isGettingStreamRef.current = true
      
      try {
        console.log(`🎥 Attempting to get media stream (attempt ${retryCount + 1}/6)...`)
        
        // ✅ USE GLOBAL STREAM MANAGER - Shares camera like Google Meet!
        const stream = await globalStreamManager.getStream()
        
        setLocalStream(stream)
        localStreamRef.current = stream
        setCameraError(null)
        isGettingStreamRef.current = false
        console.log('✅ Local stream obtained (shared across tabs if needed)')
      } catch (error) {
        isGettingStreamRef.current = false
        console.error(`❌ Error accessing media (attempt ${retryCount + 1}/6):`, error.name, error.message)
        
        // ✅ HANDLE DIFFERENT ERROR TYPES
        if (error.name === 'NotReadableError') {
          // Device is in use - but this should be rare now with stream sharing!
          if (retryCount < 5) {
            const delay = (retryCount + 1) * 1500 // 1.5s, 3s, 4.5s, 6s, 7.5s
            console.log(`⏳ Device in use, retrying in ${delay}ms... (attempt ${retryCount + 2}/6)`)
            setCameraError(`Camera is in use. Retrying... (${retryCount + 1}/5)`)
            
            retryTimeoutRef.current = setTimeout(() => {
              getLocalStream(retryCount + 1)
            }, delay)
          } else {
            console.error('❌ Failed to get media stream after 6 attempts')
            setCameraError('CAMERA_IN_USE')
          }
        } else if (error.name === 'NotAllowedError') {
          // User denied permission
          console.error('❌ Camera/microphone permission denied')
          setCameraError('PERMISSION_DENIED')
        } else if (error.name === 'NotFoundError') {
          // No camera/microphone found
          console.error('❌ No camera/microphone found')
          setCameraError('DEVICE_NOT_FOUND')
        } else {
          // Other errors
          console.error('❌ Unknown error:', error)
          setCameraError('UNKNOWN_ERROR')
        }
      }
    }

    getLocalStream()

    return () => {
      // Cleanup
      isGettingStreamRef.current = false
      
      // Clear retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      
      // Release stream through global manager
      if (localStreamRef.current) {
        console.log('🧹 Cleaning up local stream...')
        globalStreamManager.releaseStream(localStreamRef.current)
        localStreamRef.current = null
      }
      
      peersRef.current.forEach(peer => peer.close())
      peersRef.current.clear()
    }
  }, [])

  const createPeerConnection = useCallback((userId) => {
    console.log('🔗 Creating peer connection for:', userId)
    
    // ✅ FIXED: Added TURN servers for better connectivity across firewalls/NAT
    const configuration = {
      iceServers: [
        // STUN servers (for discovering public IP)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        
        // TURN servers from ExpressTurn (your credentials)
        {
          urls: 'turn:free.expressturn.com:3478',
          username: '000000002084607662',
          credential: 'FnCo9YYhwp0/SQRgCuEobGyz4Zo='
        },
        {
          urls: 'turns:free.expressturn.com:5349',
          username: '000000002084607662',
          credential: 'FnCo9YYhwp0/SQRgCuEobGyz4Zo='
        },
        
        // Backup TURN servers from metered.ca (free public)
        {
          urls: 'turn:a.relay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:a.relay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      // Better ICE candidate gathering
      iceCandidatePoolSize: 10
    }
    
    const peerConnection = new RTCPeerConnection(configuration)

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('➕ Adding track:', track.kind, 'to peer:', userId)
        peerConnection.addTrack(track, localStreamRef.current)
      })
    } else {
      console.warn('⚠️ No local stream available when creating peer connection')
    }

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log('📹 Received remote track from:', userId, event.track.kind)
      console.log('📹 Stream ID:', event.streams[0].id)
      setRemoteStreams(prev => {
        const newMap = new Map(prev)
        newMap.set(userId, event.streams[0])
        console.log('✅ Remote stream added for:', userId, '- Total remote streams:', newMap.size)
        return newMap
      })
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('🧊 Sending ICE candidate to:', userId, '- Type:', event.candidate.type)
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: userId
        })
      } else if (!event.candidate) {
        console.log('✅ ICE gathering complete for:', userId)
      }
    }

    // Monitor connection state
    peerConnection.onconnectionstatechange = () => {
      console.log('🔌 Connection state for', userId, ':', peerConnection.connectionState)
      if (peerConnection.connectionState === 'failed') {
        console.error('❌ Connection failed for:', userId)
        console.log('🔄 Attempting to restart ICE...')
        peerConnection.restartIce()
      } else if (peerConnection.connectionState === 'connected') {
        console.log('✅ Peer connection established for:', userId)
      }
    }

    // Monitor ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state for', userId, ':', peerConnection.iceConnectionState)
      if (peerConnection.iceConnectionState === 'failed') {
        console.error('❌ ICE connection failed - TURN servers may be needed')
      } else if (peerConnection.iceConnectionState === 'connected') {
        console.log('✅ ICE connection established for:', userId)
      }
    }

    peersRef.current.set(userId, peerConnection)
    console.log('✅ Peer connection created and stored for:', userId, '- Total peers:', peersRef.current.size)
    return peerConnection
  }, [socket])

  const createOffer = useCallback(async (userId) => {
    try {
      console.log('📤 Creating offer for:', userId)
      
      const peerConnection = createPeerConnection(userId)
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      
      if (socket) {
        socket.emit('offer', {
          offer,
          to: userId,
          roomCode
        })
        console.log('✅ Offer sent to:', userId)
      }
    } catch (error) {
      console.error('❌ Error creating offer:', error)
    }
  }, [socket, roomCode, createPeerConnection])

  const handleOffer = useCallback(async (offer, from) => {
    try {
      console.log('📥 Received offer from:', from)
      
      // Check if peer already exists, if so, close it first
      if (peersRef.current.has(from)) {
        console.log('⚠️ Peer already exists, closing old connection')
        const oldPeer = peersRef.current.get(from)
        oldPeer.close()
        peersRef.current.delete(from)
      }
      
      const peerConnection = createPeerConnection(from)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      
      if (socket) {
        socket.emit('answer', { answer, to: from })
        console.log('✅ Answer sent to:', from)
      }
      
      // Process any pending ICE candidates
      if (pendingCandidatesRef.current.has(from)) {
        const candidates = pendingCandidatesRef.current.get(from)
        console.log(`🧊 Processing ${candidates.length} pending ICE candidates for:`, from)
        
        for (const candidate of candidates) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            console.log('✅ Added pending ICE candidate for:', from)
          } catch (error) {
            console.error('❌ Error adding pending ICE candidate:', error)
          }
        }
        
        pendingCandidatesRef.current.delete(from)
      }
    } catch (error) {
      console.error('❌ Error handling offer:', error)
    }
  }, [socket, createPeerConnection])

  const handleAnswer = useCallback(async (answer, from) => {
    try {
      console.log('📥 Received answer from:', from)
      const peerConnection = peersRef.current.get(from)
      if (peerConnection) {
        // Check if we're in the right state to receive an answer
        if (peerConnection.signalingState === 'have-local-offer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
          console.log('✅ Answer set for:', from)
          
          // Process any pending ICE candidates
          if (pendingCandidatesRef.current.has(from)) {
            const candidates = pendingCandidatesRef.current.get(from)
            console.log(`🧊 Processing ${candidates.length} pending ICE candidates for:`, from)
            
            for (const candidate of candidates) {
              try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                console.log('✅ Added pending ICE candidate for:', from)
              } catch (error) {
                console.error('❌ Error adding pending ICE candidate:', error)
              }
            }
            
            pendingCandidatesRef.current.delete(from)
          }
        } else {
          console.warn('⚠️ Cannot set answer, wrong signaling state:', peerConnection.signalingState)
        }
      } else {
        console.warn('⚠️ No peer connection found for:', from)
      }
    } catch (error) {
      console.error('❌ Error handling answer:', error)
    }
  }, [])

  const handleIceCandidate = useCallback(async (candidate, from) => {
    try {
      console.log('🧊 Received ICE candidate from:', from)
      const peerConnection = peersRef.current.get(from)
      
      if (!peerConnection) {
        console.warn('⚠️ No peer connection found for:', from, '- queuing candidate')
        if (!pendingCandidatesRef.current.has(from)) {
          pendingCandidatesRef.current.set(from, [])
        }
        pendingCandidatesRef.current.get(from).push(candidate)
        return
      }
      
      // Check if remote description is set
      if (!peerConnection.remoteDescription) {
        console.warn('⚠️ Remote description not set for:', from, '- queuing candidate')
        if (!pendingCandidatesRef.current.has(from)) {
          pendingCandidatesRef.current.set(from, [])
        }
        pendingCandidatesRef.current.get(from).push(candidate)
        return
      }
      
      // Remote description is set, add the candidate
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      console.log('✅ ICE candidate added for:', from)
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error)
    }
  }, [])

  const removePeer = useCallback((userId) => {
    console.log('👋 Removing peer:', userId)
    const peerConnection = peersRef.current.get(userId)
    if (peerConnection) {
      peerConnection.close()
      peersRef.current.delete(userId)
    }
    
    // Clear any pending candidates
    if (pendingCandidatesRef.current.has(userId)) {
      pendingCandidatesRef.current.delete(userId)
    }
    
    setRemoteStreams(prev => {
      const newMap = new Map(prev)
      newMap.delete(userId)
      return newMap
    })
  }, [])

  return {
    localStream,
    remoteStreams,
    cameraError,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    removePeer
  }
}
