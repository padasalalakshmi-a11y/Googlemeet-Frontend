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
    
    // ✅ OPTIMIZED: Better settings for faster and more accurate recognition
    recognition.continuous = true        // Keep listening continuously
    recognition.interimResults = false   // ✅ CHANGED: Only get final results (faster!)
    recognition.lang = language
    recognition.maxAlternatives = 1      // ✅ CHANGED: Only best match (faster!)

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started')
    }

    // ✅ ADDED: Audio detection events for better debugging
    recognition.onaudiostart = () => {
      console.log('🎤 Audio input detected from microphone')
    }

    recognition.onsoundstart = () => {
      console.log('🔊 Sound detected')
    }

    recognition.onspeechstart = () => {
      console.log('🗣️ Speech detected - listening...')
    }

    recognition.onspeechend = () => {
      console.log('🗣️ Speech ended')
    }

    recognition.onresult = (event) => {
      // ✅ OPTIMIZED: Get result immediately and send fast
      const lastResult = event.results[event.results.length - 1]
      
      if (lastResult.isFinal) {
        const text = lastResult[0].transcript.trim()
        const confidence = lastResult[0].confidence
        
        console.log('🎙️ Speech recognized!')
        console.log('   Text:', text)
        console.log('   Confidence:', (confidence * 100).toFixed(1) + '%')
        console.log('   Sending immediately...')
        
        // Send immediately
        setTranscript(text)
      }
    }

    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error)
      
      // ✅ IMPROVED: Better error handling with user-friendly messages
      if (event.error === 'aborted') {
        console.log('⚠️ Recognition aborted')
        setIsListening(false)
        isListeningRef.current = false
      } else if (event.error === 'no-speech') {
        console.log('⚠️ No speech detected')
        console.log('💡 Tips:')
        console.log('   - Speak louder and clearer')
        console.log('   - Check microphone is not muted')
        console.log('   - Reduce background noise')
        console.log('   - Make sure browser has microphone permission')
        // Don't stop - keep listening
      } else if (event.error === 'audio-capture') {
        console.error('❌ No microphone found or permission denied')
        console.log('💡 Fix: Check browser microphone permissions')
        setIsListening(false)
        isListeningRef.current = false
      } else if (event.error === 'not-allowed') {
        console.error('❌ Microphone permission denied')
        console.log('💡 Fix: Allow microphone access in browser settings')
        setIsListening(false)
        isListeningRef.current = false
      } else if (event.error === 'network') {
        console.error('❌ Network error')
        console.log('💡 Fix: Check internet connection')
      } else {
        console.error('❌ Unknown error:', event.error)
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
