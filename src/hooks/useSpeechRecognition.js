import { useState, useEffect, useRef, useCallback } from 'react'

export function useSpeechRecognition(language = 'en-US') {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const recognitionRef = useRef(null)
  const isListeningRef = useRef(false)
  const restartTimeoutRef = useRef(null)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
    setIsMobile(checkMobile)
    console.log('📱 Device type:', checkMobile ? 'Mobile' : 'Desktop')
  }, [])

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('❌ Speech recognition not supported in this browser')
      return
    }

    // ✅ FIX 1: Only initialize when page is visible and active
    if (document.hidden || document.visibilityState === 'hidden') {
      console.log('⏸️ Page hidden - delaying recognition initialization')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    // ✅ FIX 2: Different settings for mobile vs desktop
    recognition.continuous = !isMobile // Mobile: false, Desktop: true
    recognition.interimResults = false
    recognition.lang = language
    recognition.maxAlternatives = 1

    console.log('🎤 Recognition settings:', {
      continuous: recognition.continuous,
      interimResults: recognition.interimResults,
      isMobile: isMobile,
      language: language
    })

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started')
      if (isMobile) {
        console.log('📱 MOBILE MODE: Speak ONE sentence, then pause')
        console.log('📱 Recognition will auto-stop after ~3-5 seconds of silence')
      }
    }

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
      console.log('🗣️ Speech ended - processing...')
    }

    recognition.onresult = (event) => {
      console.log('📝 ✅ onresult EVENT FIRED!')
      console.log(' 📊 Total results:', event.results.length)

      const lastResult = event.results[event.results.length - 1]
      
      if (lastResult.isFinal) {
        const text = lastResult[0].transcript.trim()
        const confidence = lastResult[0].confidence
        
        console.log('🎙️ FINAL Speech recognized!')
        console.log(' Text:', text)
        console.log(' Confidence:', (confidence * 100).toFixed(1) + '%')
        
        setTranscript(text)
      } else {
        console.log('⏳ Interim result:', lastResult[0].transcript)
      }
    }

    recognition.onnomatch = (event) => {
      console.warn('⚠️ onnomatch: Speech not recognized')
      console.warn('💡 Try speaking louder and more clearly')
    }

    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error)
      
      if (event.error === 'aborted') {
        console.log('⚠️ Recognition aborted')
        setIsListening(false)
        isListeningRef.current = false
      } else if (event.error === 'no-speech') {
        console.log('⚠️ No speech detected')
        // ✅ FIX 3: On mobile, restart manually
        if (isMobile && isListeningRef.current) {
          console.log('🔄 Mobile: Restarting after no-speech...')
          setTimeout(() => {
            if (isListeningRef.current) {
              try {
                recognition.start()
              } catch (e) {
                console.error('Failed to restart:', e)
              }
            }
          }, 500)
        }
      } else if (event.error === 'audio-capture' || event.error === 'not-allowed') {
        console.error('❌ Microphone permission issue')
        setIsListening(false)
        isListeningRef.current = false
      } else if (event.error === 'network') {
        console.error('❌ Network error')
      }
    }

    recognition.onend = () => {
      console.log('🛑 Speech recognition ended')
      
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }

      // ✅ FIX 4: Different restart logic for mobile
      if (isListeningRef.current) {
        if (isMobile) {
          // Mobile: Immediate restart with longer delay
          console.log('🔄 Mobile: Restarting with 300ms delay...')
          restartTimeoutRef.current = setTimeout(() => {
            try {
              recognition.start()
              console.log('✅ Mobile recognition restarted')
            } catch (error) {
              if (!error.message?.includes('already started')) {
                console.error('❌ Failed to restart:', error)
                setIsListening(false)
                isListeningRef.current = false
              }
            }
          }, 300)
        } else {
          // Desktop: Quick restart
          console.log('🔄 Desktop: Restarting with 100ms delay...')
          restartTimeoutRef.current = setTimeout(() => {
            try {
              recognition.start()
              console.log('✅ Desktop recognition restarted')
            } catch (error) {
              if (!error.message?.includes('already started')) {
                console.error('❌ Failed to restart:', error)
                setIsListening(false)
                isListeningRef.current = false
              }
            }
          }, 100)
        }
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
          // Ignore cleanup errors
        }
      }
    }
  }, [language, isMobile])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.error('❌ Speech recognition not initialized')
      console.error('💡 Possible reasons:')
      console.error(' - Page is hidden/in background')
      console.error(' - Browser does not support speech recognition')
      console.error(' - Recognition initialization failed')
      return
    }

    if (isListeningRef.current) {
      console.log('⚠️ Already listening')
      return
    }

    // ✅ FIX 5: Add visibility check before starting
    if (document.hidden) {
      console.error('❌ Cannot start - page is hidden')
      console.error('💡 Make sure the page/tab is visible and active')
      return
    }

    try {
      console.log('🚀 Attempting to start speech recognition...')
      console.log('📱 Device:', isMobile ? 'Mobile' : 'Desktop')
      console.log('🔍 Page visible:', !document.hidden)
      
      recognitionRef.current.start()
      setIsListening(true)
      isListeningRef.current = true
      
      console.log('✅ Started listening successfully')
    } catch (error) {
      console.error('❌ Error starting recognition:', error)
      console.error('💡 Error details:', error.message)
      
      if (error.message?.includes('already started')) {
        setIsListening(true)
        isListeningRef.current = true
        console.log('⚠️ Was already started - updated state')
      }
    }
  }, [isMobile])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) {
      return
    }

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
    resetTranscript,
    isMobile // ✅ Export this so your UI can show mobile-specific instructions
  }
}