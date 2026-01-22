import { useState, useRef, useEffect, useCallback } from 'react'

export function useWebRTC(socket, roomCode) {
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState(new Map())
  const peersRef = useRef(new Map())
  const localStreamRef = useRef(null)
  const pendingCandidatesRef = useRef(new Map()) // Queue for ICE candidates

  useEffect(() => {
    // Get local media stream
    const getLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        setLocalStream(stream)
        localStreamRef.current = stream
        console.log('✅ Local stream obtained')
      } catch (error) {
        console.error('❌ Error accessing media:', error)
      }
    }

    getLocalStream()

    return () => {
      // Cleanup
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
      peersRef.current.forEach(peer => peer.close())
      peersRef.current.clear()
    }
  }, [])

  const createPeerConnection = useCallback((userId) => {
    console.log('🔗 Creating peer connection for:', userId)
    
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
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
        console.log('🧊 Sending ICE candidate to:', userId)
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: userId
        })
      }
    }

    // Monitor connection state
    peerConnection.onconnectionstatechange = () => {
      console.log('🔌 Connection state for', userId, ':', peerConnection.connectionState)
      if (peerConnection.connectionState === 'failed') {
        console.error('❌ Connection failed for:', userId)
      }
    }

    // Monitor ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state for', userId, ':', peerConnection.iceConnectionState)
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
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    removePeer
  }
}
