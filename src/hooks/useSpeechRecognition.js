import { useState, useEffect, useRef, useCallback } from 'react'

export function useSpeechRecognition(language = 'en-US') {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)
  const isListeningRef = useRef(false)
  const restartTimeoutRef = useRef(null)

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('❌ Speech recognition not supported in this browser')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started')
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' '
        }
      }
      
      if (finalTranscript.trim()) {
        console.log('🎙️ Speech recognized!')
        console.log('   Text:', finalTranscript.trim())
        console.log('   Language:', language)
        console.log('   Confidence:', event.results[event.results.length - 1][0].confidence)
        setTranscript(finalTranscript.trim())
      }
    }

    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error)
      
      // Handle different error types
      if (event.error === 'aborted') {
        // Don't restart on abort - user likely stopped it
        console.log('⚠️ Recognition aborted')
        setIsListening(false)
        isListeningRef.current = false
      } else if (event.error === 'no-speech') {
        console.log('⚠️ No speech detected, continuing to listen...')
        // Continue listening
      } else if (event.error === 'audio-capture') {
        console.error('❌ No microphone found or permission denied')
        setIsListening(false)
        isListeningRef.current = false
      } else if (event.error === 'not-allowed') {
        console.error('❌ Microphone permission denied')
        setIsListening(false)
        isListeningRef.current = false
      }
    }

    recognition.onend = () => {
      console.log('🛑 Speech recognition ended')
      
      // Clear any pending restart
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
      
      // Auto-restart if still supposed to be listening
      if (isListeningRef.current) {
        console.log('🔄 Auto-restarting speech recognition...')
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognition.start()
            console.log('✅ Speech recognition restarted')
          } catch (error) {
            console.error('❌ Error restarting recognition:', error)
            // If already started, ignore the error
            if (error.message && !error.message.includes('already started')) {
              setIsListening(false)
              isListeningRef.current = false
            }
          }
        }, 100) // Small delay before restart
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          // Ignore errors on cleanup
        }
      }
    }
  }, [language])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.error('❌ Speech recognition not initialized')
      return
    }

    if (isListeningRef.current) {
      console.log('⚠️ Already listening')
      return
    }

    try {
      recognitionRef.current.start()
      setIsListening(true)
      isListeningRef.current = true
      console.log('✅ Started listening')
    } catch (error) {
      console.error('❌ Error starting recognition:', error)
      // If already started, just update state
      if (error.message && error.message.includes('already started')) {
        setIsListening(true)
        isListeningRef.current = true
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) {
      return
    }

    // Clear any pending restart
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }

    try {
      isListeningRef.current = false
      setIsListening(false)
      recognitionRef.current.stop()
      console.log('✅ Stopped listening')
    } catch (error) {
      console.error('❌ Error stopping recognition:', error)
    }
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript
  }
}
