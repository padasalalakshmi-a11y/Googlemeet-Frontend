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
      console.log('   ⏰ Waiting for speech to end and process...')
      console.log('   📊 Recognition settings:')
      console.log('      - continuous:', recognition.continuous)
      console.log('      - interimResults:', recognition.interimResults)
      console.log('      - lang:', recognition.lang)
    }

    recognition.onspeechend = () => {
      console.log('🗣️ Speech ended')
      console.log('   ⏳ Processing speech now...')
      console.log('   🔍 Waiting for onresult event...')
    }

    recognition.onresult = (event) => {
      console.log('📝 ✅ onresult EVENT FIRED!')
      console.log('   📊 Event details:')
      console.log('      - Total results:', event.results.length)
      console.log('      - Result index:', event.resultIndex)
      
      // ✅ OPTIMIZED: Get result immediately and send fast
      const lastResult = event.results[event.results.length - 1]
      
      console.log('   📋 Last result details:')
      console.log('      - isFinal:', lastResult.isFinal)
      console.log('      - alternatives:', lastResult.length)
      
      if (lastResult.isFinal) {
        const text = lastResult[0].transcript.trim()
        const confidence = lastResult[0].confidence
        
        console.log('🎙️ Speech recognized!')
        console.log('   Text:', text)
        console.log('   Confidence:', (confidence * 100).toFixed(1) + '%')
        console.log('   Sending immediately...')
        
        // Send immediately
        setTranscript(text)
      } else {
        console.log('⏳ Result not final yet, waiting...')
        console.log('   Interim text:', lastResult[0].transcript)
      }
    }

    recognition.onnomatch = (event) => {
      console.error('❌ onnomatch EVENT: Speech was detected but not recognized!')
      console.error('   💡 This means:')
      console.error('      - Browser heard speech')
      console.error('      - But could not match it to any words')
      console.error('   🔧 Possible causes:')
      console.error('      - Wrong language selected')
      console.error('      - Poor audio quality')
      console.error('      - Unclear pronunciation')
      console.error('      - Background noise')
    }

    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error)
      console.error('   📊 Error details:')
      console.error('      - Error type:', event.error)
      console.error('      - Message:', event.message || 'No message')
      
      // ✅ IMPROVED: Better error handling with user-friendly messages
      if (event.error === 'aborted') {
        console.log('⚠️ Recognition aborted')
        setIsListening(false)
        isListeningRef.current = false
      } else if (event.error === 'no-speech') {
        console.log('⚠️ No speech detected - Browser heard audio but no recognizable speech')
        console.log('💡 Tips:')
        console.log('   - Speak louder and clearer')
        console.log('   - Check microphone is not muted')
        console.log('   - Reduce background noise')
        console.log('   - Make sure browser has microphone permission')
        console.log('   - Check if correct language is selected')
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
        console.error('❌ Network error - Cannot reach Google speech recognition servers')
        console.log('💡 Fix: Check internet connection')
      } else if (event.error === 'service-not-allowed') {
        console.error('❌ Speech recognition service not allowed')
        console.error('💡 This might be due to:')
        console.error('   - Browser security settings')
        console.error('   - HTTPS requirement not met')
        console.error('   - Browser does not support speech recognition')
      } else if (event.error === 'language-not-supported') {
        console.error('❌ Language not supported!')
        console.error('   Selected language:', language)
        console.error('💡 Fix: Try selecting a different language')
      } else {
        console.error('❌ Unknown error:', event.error)
        console.error('   This is an unexpected error type')
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
