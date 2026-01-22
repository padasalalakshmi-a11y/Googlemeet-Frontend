import { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import { SERVER_URL } from '../config'

export function useSocket() {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Prevent multiple socket connections
    if (socketRef.current?.connected) {
      console.log('⚠️ Socket already connected, reusing existing connection')
      setIsConnected(true)
      return
    }

    console.log('🔌 Creating new socket connection to:', SERVER_URL)
    
    socketRef.current = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'] // Try websocket first, fallback to polling
    })

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected:', socketRef.current.id)
      setIsConnected(true)
    })

    socketRef.current.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason)
      setIsConnected(false)
    })

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error)
      setIsConnected(false)
    })

    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts')
      setIsConnected(true)
    })

    socketRef.current.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnection attempt', attemptNumber)
    })

    return () => {
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket')
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  return { socket: socketRef.current, isConnected }
}
