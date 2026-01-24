import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import { useWebRTC } from '../hooks/useWebRTC'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { LANGUAGES } from '../config'

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
  const { localStream, remoteStreams, createOffer, handleOffer, handleAnswer, handleIceCandidate, removePeer } = useWebRTC(socket, roomCode)
  
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false)
  const [subtitles, setSubtitles] = useState(new Map())
  const [transcriptions, setTranscriptions] = useState([])

  const localVideoRef = useRef(null)
  
  // Map language codes to speech recognition format
  const getSpeechLang = (code) => {
    const langMap = {
      'te': 'te-IN', 'hi': 'hi-IN', 'ta': 'ta-IN', 'kn': 'kn-IN',
      'ml': 'ml-IN', 'mr': 'mr-IN', 'bn': 'bn-IN', 'gu': 'gu-IN',
      'pa': 'pa-IN', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
      'it': 'it-IT', 'pt': 'pt-PT', 'ru': 'ru-RU', 'zh': 'zh-CN',
      'ja': 'ja-JP', 'ko': 'ko-KR', 'ar': 'ar-SA', 'en': 'en-US'
    }
    return langMap[code] || 'en-US'
  }
  
  const { transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition(
    getSpeechLang(speakingLanguage)
  )

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
      users.forEach(user => {
        createOffer(user.userId);
      });
    };

    const handleUserJoined = ({ userId }) => {
      setTimeout(() => {
        createOffer(userId);
      }, 100);
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

    socket.on('existing-users', handleExistingUsers);
    socket.on('user-joined', handleUserJoined);
    socket.on('offer', handleOfferReceived);
    socket.on('answer', handleAnswerReceived);
    socket.on('ice-candidate', handleIceCandidateReceived);
    socket.on('user-left', handleUserLeft);
    socket.on('translated-text', handleTranslatedText);

    return () => {
      socket.off('existing-users', handleExistingUsers);
      socket.off('user-joined', handleUserJoined);
      socket.off('offer', handleOfferReceived);
      socket.off('answer', handleAnswerReceived);
      socket.off('ice-candidate', handleIceCandidateReceived);
      socket.off('user-left', handleUserLeft);
      socket.off('translated-text', handleTranslatedText);
    };
  }, [socket, isConnected, createOffer, handleOffer, handleAnswer, handleIceCandidate, removePeer]);

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
        videoTrack.enabled = !videoTrack.enabled
        setVideoEnabled(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setAudioEnabled(audioTrack.enabled)
        
        // Stop speech recognition if mic is disabled
        if (!audioTrack.enabled && transcriptionEnabled) {
          console.log('🎤 Mic disabled - stopping speech recognition')
          stopListening()
          setTranscriptionEnabled(false)
        }
      }
    }
  }

  const toggleTranscription = () => {
    // Check if speech recognition is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser. Please use Chrome.')
      return
    }
    
    if (!audioEnabled) {
      alert('Please enable your microphone first')
      return
    }
    
    if (transcriptionEnabled) {
      console.log('⏹️ Stopping speech recognition')
      stopListening()
    } else {
      console.log('🎙️ Starting speech recognition')
      startListening()
    }
    setTranscriptionEnabled(!transcriptionEnabled)
  }

  const leaveCall = () => {
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
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden">
      {/* Header - matching room.css #16213e */}
      <div className="bg-[#16213e] px-8 py-4 flex justify-between items-center border-b-2 border-[#0f3460]">
        <div className="flex flex-col gap-1">
          <span className="text-lg font-bold text-[#00d4ff]">Room: {roomCode}</span>
          <span className="text-sm text-gray-400">
            Speaking: {getLanguageName(speakingLanguage)} → Hearing: {getLanguageName(receiveLanguage)}
          </span>
        </div>
        <button 
          onClick={leaveCall}
          className="bg-[#e94560] hover:bg-[#d63447] text-white px-6 py-2.5 rounded-lg font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(233,69,96,0.4)]"
        >
          Leave Call
        </button>
      </div>

      {/* Video Grid - matching room.css */}
      <div className="flex-1 grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-5 p-5 overflow-y-auto">
        {/* Local Video */}
        <div className="relative bg-[#0f3460] rounded-xl overflow-hidden aspect-video shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!videoEnabled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f3460] gap-2.5">
              <div className="text-6xl">📹</div>
              <p className="text-white">Camera Off</p>
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-black/70 px-4 py-2 rounded-lg text-sm font-semibold">
            You
          </div>
        </div>

        {/* Remote Videos */}
        {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
          <RemoteVideo
            key={userId}
            stream={stream}
            subtitle={subtitles.get(userId)}
          />
        ))}
      </div>

      {/* Controls - matching room.css */}
      <div className="bg-[#16213e] px-5 py-5 flex justify-center gap-5 border-t-2 border-[#0f3460]">
        <button
          onClick={toggleVideo}
          className={`min-w-[80px] h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-1 px-2.5 py-2.5 transition-all hover:scale-105 ${
            videoEnabled 
              ? 'bg-[#00d4ff] border-[#00d4ff] text-black shadow-[0_0_20px_rgba(0,212,255,0.5)]' 
              : 'bg-[#0f3460] border-[#0f3460] text-white hover:bg-[#1a4d7a] hover:border-[#00d4ff]'
          }`}
          title="Toggle Camera"
        >
          <span className="text-[32px]">📹</span>
          <span className="text-xs font-semibold uppercase tracking-wider">Video</span>
        </button>

        <button
          onClick={toggleAudio}
          className={`min-w-[80px] h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-1 px-2.5 py-2.5 transition-all hover:scale-105 ${
            audioEnabled 
              ? 'bg-[#00d4ff] border-[#00d4ff] text-black shadow-[0_0_20px_rgba(0,212,255,0.5)]' 
              : 'bg-[#0f3460] border-[#0f3460] text-white hover:bg-[#1a4d7a] hover:border-[#00d4ff]'
          }`}
          title="Toggle Microphone"
        >
          <span className="text-[32px]">🎤</span>
          <span className="text-xs font-semibold uppercase tracking-wider">Mic</span>
        </button>

        <button
          onClick={toggleTranscription}
          className={`min-w-[80px] h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-1 px-2.5 py-2.5 transition-all hover:scale-105 ${
            transcriptionEnabled 
              ? 'bg-[#00d4ff] border-[#00d4ff] text-black shadow-[0_0_20px_rgba(0,212,255,0.5)]' 
              : 'bg-[#0f3460] border-[#0f3460] text-white hover:bg-[#1a4d7a] hover:border-[#00d4ff]'
          }`}
          title="Toggle Translation"
        >
          <span className="text-[32px]">💬</span>
          <span className="text-xs font-semibold uppercase tracking-wider">Translate</span>
        </button>

        <button
          onClick={leaveCall}
          className="min-w-[80px] h-20 rounded-xl border-2 border-[#e94560] bg-[#e94560] text-white flex flex-col items-center justify-center gap-1 px-2.5 py-2.5 transition-all hover:scale-105 hover:bg-[#d63447] hover:border-[#d63447]"
          title="Leave Call"
        >
          <span className="text-[32px]">📞</span>
          <span className="text-xs font-semibold uppercase tracking-wider">Leave</span>
        </button>
      </div>

      {/* Transcription Panel - matching room.css */}
      <div 
        className={`fixed top-0 bottom-0 w-[350px] bg-[#16213e] p-5 overflow-y-auto border-l-2 border-[#0f3460] z-[1000] transition-all duration-300 ${
          transcriptionEnabled ? 'right-0' : '-right-[350px]'
        }`}
      >
        <h3 className="text-[#00d4ff] text-xl font-bold mb-5">Live Transcription</h3>
        <div className="flex flex-col gap-4">
          {transcriptions.map((item, index) => (
            <div 
              key={index} 
              className="bg-[#0f3460] p-4 rounded-lg border-l-[3px] border-[#00d4ff]"
            >
              <div className="text-gray-400 text-[13px] mb-2">Original: {item.original}</div>
              <div className="text-white text-[15px] font-medium">{item.translated}</div>
            </div>
          ))}
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
    }
  }, [stream])

  return (
    <div className="relative bg-[#0f3460] rounded-xl overflow-hidden aspect-video shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-4 left-4 bg-black/70 px-4 py-2 rounded-lg text-sm font-semibold">
        Remote User
      </div>
      {subtitle && (
        <div className="absolute bottom-[60px] left-1/2 -translate-x-1/2 bg-black/90 px-5 py-3 rounded-lg text-base max-w-[80%] text-center transition-opacity">
          {subtitle}
        </div>
      )}
    </div>
  )
}
