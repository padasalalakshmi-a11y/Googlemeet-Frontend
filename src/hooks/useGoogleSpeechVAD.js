// Google Cloud Speech Recognition with Voice Activity Detection (VAD)
// Features:
// - Only transcribes when user is actually speaking (saves API costs!)
// - SIZE-BASED auto-chunking: Stops at 400KB to prevent backend errors
// - Real-time size monitoring: Tracks audio size every second
// - ZERO-GAP recording: New recording starts IMMEDIATELY when chunk completes
// - Parallel processing: Backend processes while new recording captures speech
// - NO SPEECH LOST: Continuous recording even during backend processing!

import { useState, useRef, useCallback, useEffect } from 'react'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'

export function useGoogleSpeechVAD(language = 'en') {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const silenceTimeoutRef = useRef(null)
  const isSpeakingRef = useRef(false)
  const isListeningRef = useRef(false)
  const recordingTimeoutRef = useRef(null)
  const recordingStartTimeRef = useRef(null)
  const currentAudioSizeRef = useRef(0)
  const sizeCheckIntervalRef = useRef(null)

  // Voice Activity Detection using Web Audio API
  const detectVoiceActivity = useCallback(() => {
    if (!analyserRef.current) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserRef.current.getByteFrequencyData(dataArray)

    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength
    
    // Stricter threshold to avoid background noise
    const SPEECH_THRESHOLD = 35 // Higher = less sensitive to noise
    const isSpeakingNow = average > SPEECH_THRESHOLD

    // User started speaking
    if (isSpeakingNow && !isSpeakingRef.current) {
      console.log('🎤 Speech detected! Starting recording...')
      console.log('   Volume level:', Math.round(average))
      isSpeakingRef.current = true
      setIsSpeaking(true)
      
      // Clear any existing silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
      
      // Start recording if not already recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
        audioChunksRef.current = []
        currentAudioSizeRef.current = 0
        recordingStartTimeRef.current = Date.now()
        
        // Start with timeslice to get data chunks every 1 second
        mediaRecorderRef.current.start(1000)
        console.log('✅ Recording started with size monitoring')
        
        // Monitor size every second
        sizeCheckIntervalRef.current = setInterval(() => {
          const MAX_SIZE = 400000 // 400KB limit (safe buffer)
          const currentSize = currentAudioSizeRef.current
          const elapsed = Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
          
          console.log(`📊 Recording: ${elapsed}s, Size: ${Math.round(currentSize / 1024)}KB`)
          
          if (currentSize > MAX_SIZE && mediaRecorderRef.current?.state === 'recording') {
            console.log('⚠️ Size limit reached! Auto-stopping...')
            clearInterval(sizeCheckIntervalRef.current)
            sizeCheckIntervalRef.current = null
            mediaRecorderRef.current.stop()
          }
        }, 1000)
        
        // Backup: 30-second timeout
        recordingTimeoutRef.current = setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('⏱️ 30 seconds reached - auto-processing chunk...')
            if (sizeCheckIntervalRef.current) {
              clearInterval(sizeCheckIntervalRef.current)
              sizeCheckIntervalRef.current = null
            }
            mediaRecorderRef.current.stop()
          }
        }, 10000)
      }
    }
    
    // User stopped speaking (silence detected)
    if (!isSpeakingNow && isSpeakingRef.current) {
      console.log('🔇 Silence detected, waiting...')
      
      // Wait for 1.5 seconds of silence before stopping
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      
      silenceTimeoutRef.current = setTimeout(() => {
        if (isSpeakingRef.current && isListeningRef.current) {
          console.log('⏹️ 0.8s silence confirmed, stopping recording...')
          isSpeakingRef.current = false
          setIsSpeaking(false)
          
          // Stop recording and process
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
        }
      }, 800) // 0.8 seconds of silence (faster response!)
    }

    // Continue monitoring if still listening
    if (isListeningRef.current) {
      requestAnimationFrame(detectVoiceActivity)
    }
  }, [])

  const startListening = useCallback(async () => {
    try {
      console.log('🎤 Starting Voice Activity Detection mode...')
      console.log('   Language:', language)
      console.log('💡 Speak anytime - will auto-detect and transcribe!')
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        } 
      })
      
      streamRef.current = stream
      audioChunksRef.current = []
      
      // Set up Web Audio API for voice detection
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)
      
      analyser.smoothingTimeConstant = 0.8
      analyser.fftSize = 2048
      
      microphone.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      
      // Audio processing function - WITH ZERO-GAP RESTART!
      const processAudio = async () => {
        console.log('🎤 Processing audio segment...')
        
        // CRITICAL: Save the audio chunks BEFORE clearing (for parallel processing)
        const chunksToProcess = [...audioChunksRef.current]
        const processingStartTime = recordingStartTimeRef.current
        
        // Clear timeouts and intervals
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current)
          recordingTimeoutRef.current = null
        }
        
        if (sizeCheckIntervalRef.current) {
          clearInterval(sizeCheckIntervalRef.current)
          sizeCheckIntervalRef.current = null
        }
        
        if (chunksToProcess.length === 0) {
          console.log('⚠️ No audio chunks, skipping...')
          return
        }
        
        // Check if user is still speaking (for auto-restart)
        const shouldAutoRestart = isSpeakingRef.current && isListeningRef.current
        
        // 🚀 IMMEDIATELY START NEW RECORDING (ZERO GAP!)
        if (shouldAutoRestart) {
          console.log('🔄 User still speaking - starting new recording IMMEDIATELY (no gap)...')
          
          // Reset for new recording
          audioChunksRef.current = []
          currentAudioSizeRef.current = 0
          recordingStartTimeRef.current = Date.now()
          
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
            mediaRecorderRef.current.start(1000)
            console.log('✅ New recording started (parallel processing)')
            
            // Monitor size every second
            sizeCheckIntervalRef.current = setInterval(() => {
              const MAX_SIZE = 400000 // 400KB limit
              const currentSize = currentAudioSizeRef.current
              const elapsed = Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
              
              console.log(`📊 Recording: ${elapsed}s, Size: ${Math.round(currentSize / 1024)}KB`)
              
              if (currentSize > MAX_SIZE && mediaRecorderRef.current?.state === 'recording') {
                console.log('⚠️ Size limit reached! Auto-stopping...')
                clearInterval(sizeCheckIntervalRef.current)
                sizeCheckIntervalRef.current = null
                mediaRecorderRef.current.stop()
              }
            }, 1000)
            
            // Backup: 30-second timeout
            recordingTimeoutRef.current = setTimeout(() => {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                console.log('⏱️ 30 seconds reached - auto-processing chunk...')
                if (sizeCheckIntervalRef.current) {
                  clearInterval(sizeCheckIntervalRef.current)
                  sizeCheckIntervalRef.current = null
                }
                mediaRecorderRef.current.stop()
              }
            }, 20000)
          }
        }
        
        // NOW process the saved chunks in parallel (while new recording captures audio)
        try {
          const audioBlob = new Blob(chunksToProcess, { type: 'audio/webm' })
          const recordingDuration = Date.now() - processingStartTime
          console.log('   Audio size:', audioBlob.size, 'bytes')
          console.log('   Recording duration:', Math.round(recordingDuration / 1000), 'seconds')
          
          // Check if audio is substantial
          if (audioBlob.size < 5000) {
            console.log('⚠️ Audio too small (< 5KB), skipping...')
            return
          }
          
          setIsProcessing(true)
          
          // Send to backend
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')
          formData.append('language', language)
          
          console.log('📤 Sending to Google Speech API (parallel with new recording)...')
          const processingStart = Date.now()
          
          const response = await fetch(`${SERVER_URL}/api/speech/transcribe`, {
            method: 'POST',
            body: formData
          })
          
          const processingTime = Date.now() - processingStart
          console.log(`⏱️ Backend processing took: ${processingTime}ms`)
          
          if (!response.ok) {
            console.error('❌ Backend error:', response.status)
            setIsProcessing(false)
            return
          }
          
          const result = await response.json()
          
          if (result.success && result.text && result.text.trim()) {
            console.log('✅ Transcription:', result.text)
            console.log('   Processing time:', result.processingTime, 'ms')
            setTranscript(result.text)
          } else {
            console.log('⚠️ No transcription returned')
          }
          
          setIsProcessing(false)
          
        } catch (error) {
          console.error('❌ Error:', error.message)
          setIsProcessing(false)
        }
      }
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      
      // Collect audio data and track size in real-time
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
          currentAudioSizeRef.current += event.data.size
          console.log(`📦 Chunk received: ${event.data.size} bytes, Total: ${Math.round(currentAudioSizeRef.current / 1024)}KB`)
        }
      }
      
      // Process when recording stops
      mediaRecorder.onstop = processAudio
      
      // Start voice activity detection
      setIsListening(true)
      isListeningRef.current = true
      detectVoiceActivity()
      
      console.log('✅ VAD mode active - speak anytime!')
      
    } catch (error) {
      console.error('❌ Error starting VAD:', error)
      if (error.name === 'NotAllowedError') {
        alert('Microphone permission denied. Please allow microphone access.')
      } else {
        alert('Failed to start recording. Please check your microphone.')
      }
    }
  }, [language, detectVoiceActivity])
  
  const stopListening = useCallback(() => {
    console.log('⏹️ Stopping VAD mode...')
    
    // Update refs
    isListeningRef.current = false
    isSpeakingRef.current = false
    
    // Clear timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    
    if (sizeCheckIntervalRef.current) {
      clearInterval(sizeCheckIntervalRef.current)
      sizeCheckIntervalRef.current = null
    }
    
    // Stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    
    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    setIsListening(false)
    setIsSpeaking(false)
    
    console.log('✅ VAD mode stopped')
  }, [])
  
  const resetTranscript = useCallback(() => {
    setTranscript('')
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isListeningRef.current) {
        stopListening()
      }
    }
  }, [stopListening])
  
  return {
    transcript,
    isListening,
    isSpeaking, // New: shows if user is currently speaking
    isProcessing,
    startListening,
    stopListening,
    resetTranscript
  }
}
