// Room Page Logic - Video Call with Translation
console.log('✅ room.js loading...');

document.addEventListener('DOMContentLoaded', async function() {
  console.log('🟢 DOM Ready!');
  
  const SERVER_URL = window.SERVER_URL || 'http://localhost:3000';
  const socket = io(SERVER_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => console.log('✅ Socket connected:', socket.id));
  socket.on('disconnect', (reason) => console.log('❌ Socket disconnected:', reason));
  socket.on('connect_error', (error) => console.error('❌ Socket connection error:', error));

  // Get settings from sessionStorage
  const roomCode = sessionStorage.getItem('roomCode');
  const userName = sessionStorage.getItem('userName');
  const speakingLanguage = sessionStorage.getItem('speakingLanguage');
  const userLanguage = sessionStorage.getItem('receiveLanguage');

  console.log('Session data:', { roomCode, userName, speakingLanguage, userLanguage });

  // Check if we have session data
  if (!roomCode || !userName) {
    console.log('❌ Missing session data, redirecting...');
    window.location.href = `/prejoin?room=${roomCode || ''}`;
    return;
  }

  let localStream;
  let peers = new Map();
  let pendingCandidates = new Map(); // Queue for ICE candidates
  let recognition;
  let isRecognizing = false;

  // DOM elements
  const localVideo = document.getElementById('local-video');
  const videoGrid = document.getElementById('video-grid');
  const toggleVideoBtn = document.getElementById('toggle-video');
  const toggleAudioBtn = document.getElementById('toggle-audio');
  const toggleTranscriptionBtn = document.getElementById('toggle-transcription');
  const transcriptionPanel = document.getElementById('transcription-panel');
  const transcriptionLog = document.getElementById('transcription-log');
  const localSubtitle = document.getElementById('local-subtitle');
  const leaveBtn = document.getElementById('leave-btn');

  // Update UI
  document.getElementById('room-name').textContent = `Room: ${roomCode}`;
  document.getElementById('user-language').textContent = `Speaking: ${getLanguageName(speakingLanguage)} → Hearing: ${getLanguageName(userLanguage)}`;

  // Initialize
  async function init() {
    try {
      console.log('📹 Requesting camera and microphone...');
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      console.log('✅ Media access granted');

      localVideo.srcObject = localStream;

      // Join room via socket
      console.log('📡 Joining room...');
      socket.emit('join-room', {
        roomCode,
        roomId: roomCode,
        userName,
        language: userLanguage,
        speakingLanguage
      });

      // Initialize speech recognition
      initializeSpeechRecognition();

      console.log('✅ Initialization complete');
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  }

  // Get language name
  function getLanguageName(code) {
    const languages = {
      'en': 'English', 'te': 'Telugu', 'hi': 'Hindi', 'ta': 'Tamil',
      'kn': 'Kannada', 'ml': 'Malayalam', 'mr': 'Marathi', 'bn': 'Bengali',
      'gu': 'Gujarati', 'pa': 'Punjabi', 'es': 'Spanish', 'fr': 'French',
      'de': 'German', 'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian',
      'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic'
    };
    return languages[code] || code;
  }

  // WebRTC peer connection
  function createPeerConnection(userId) {
    console.log('🔗 Creating peer connection for:', userId);
    
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach(track => {
      console.log('➕ Adding track:', track.kind, 'to peer:', userId);
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
      console.log('📹 Received remote track from:', userId, event.track.kind);
      addRemoteVideo(userId, event.streams[0]);
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate to:', userId);
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: userId
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log('🔌 Connection state for', userId, ':', peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed') {
        console.error('❌ Connection failed for:', userId);
      } else if (peerConnection.connectionState === 'connected') {
        console.log('✅ Connection established with:', userId);
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state for', userId, ':', peerConnection.iceConnectionState);
    };

    return peerConnection;
  }

  // Add remote video
  function addRemoteVideo(userId, stream) {
    console.log('🎥 Adding remote video for:', userId);
    
    let videoContainer = document.getElementById(`video-${userId}`);
    
    if (!videoContainer) {
      videoContainer = document.createElement('div');
      videoContainer.id = `video-${userId}`;
      videoContainer.className = 'video-container';
      
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsinline = true;
      video.srcObject = stream;
      
      const label = document.createElement('div');
      label.className = 'video-label';
      label.textContent = 'Remote User';
      
      const subtitle = document.createElement('div');
      subtitle.className = 'subtitle-overlay';
      subtitle.id = `subtitle-${userId}`;
      
      videoContainer.appendChild(video);
      videoContainer.appendChild(label);
      videoContainer.appendChild(subtitle);
      videoGrid.appendChild(videoContainer);
    }
  }

  // Socket event handlers
  socket.on('existing-users', async (users) => {
    console.log('👥 Existing users:', users.length, users);
    for (const user of users) {
      console.log('📞 Creating offer for existing user:', user.userId);
      const peerConnection = createPeerConnection(user.userId);
      peers.set(user.userId, peerConnection);

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('offer', {
        offer,
        to: user.userId,
        roomCode
      });
      console.log('✅ Offer sent to:', user.userId);
    }
  });

  socket.on('user-joined', async ({ userId, userName: newUserName }) => {
    console.log('👋 New user joined:', newUserName, 'ID:', userId);
    
    // Small delay to ensure the new user's listeners are ready
    setTimeout(async () => {
      const peerConnection = createPeerConnection(userId);
      peers.set(userId, peerConnection);

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('offer', {
        offer,
        to: userId,
        roomCode
      });
      console.log('✅ Offer sent to:', userId);
    }, 100);
  });

  socket.on('offer', async ({ offer, from }) => {
    console.log('📥 Received offer from:', from);
    
    let peerConnection = peers.get(from);
    if (peerConnection) {
      console.log('⚠️ Peer already exists, closing old connection');
      peerConnection.close();
      peers.delete(from);
    }
    
    peerConnection = createPeerConnection(from);
    peers.set(from, peerConnection);

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit('answer', { answer, to: from });
    console.log('✅ Answer sent to:', from);
    
    // Process any pending ICE candidates
    if (pendingCandidates.has(from)) {
      const candidates = pendingCandidates.get(from);
      console.log(`🧊 Processing ${candidates.length} pending ICE candidates for:`, from);
      
      for (const candidate of candidates) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('✅ Added pending ICE candidate for:', from);
        } catch (error) {
          console.error('❌ Error adding pending ICE candidate:', error);
        }
      }
      
      pendingCandidates.delete(from);
    }
  });

  socket.on('answer', async ({ answer, from }) => {
    console.log('📥 Received answer from:', from);
    const peerConnection = peers.get(from);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ Answer set for:', from);
      
      // Process any pending ICE candidates
      if (pendingCandidates.has(from)) {
        const candidates = pendingCandidates.get(from);
        console.log(`🧊 Processing ${candidates.length} pending ICE candidates for:`, from);
        
        for (const candidate of candidates) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('✅ Added pending ICE candidate for:', from);
          } catch (error) {
            console.error('❌ Error adding pending ICE candidate:', error);
          }
        }
        
        pendingCandidates.delete(from);
      }
    } else {
      console.warn('⚠️ No peer connection found for:', from);
    }
  });

  socket.on('ice-candidate', async ({ candidate, from }) => {
    console.log('🧊 Received ICE candidate from:', from);
    const peerConnection = peers.get(from);
    
    if (!peerConnection) {
      console.warn('⚠️ No peer connection found for:', from, '- queuing candidate');
      if (!pendingCandidates.has(from)) {
        pendingCandidates.set(from, []);
      }
      pendingCandidates.get(from).push(candidate);
      return;
    }
    
    // Check if remote description is set
    if (!peerConnection.remoteDescription) {
      console.warn('⚠️ Remote description not set for:', from, '- queuing candidate');
      if (!pendingCandidates.has(from)) {
        pendingCandidates.set(from, []);
      }
      pendingCandidates.get(from).push(candidate);
      return;
    }
    
    // Remote description is set, add the candidate
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('✅ ICE candidate added for:', from);
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  });

  socket.on('user-left', ({ userId }) => {
    console.log('👋 User left:', userId);
    const peerConnection = peers.get(userId);
    if (peerConnection) {
      peerConnection.close();
      peers.delete(userId);
    }
    
    // Clear any pending candidates
    if (pendingCandidates.has(userId)) {
      pendingCandidates.delete(userId);
    }

    const videoContainer = document.getElementById(`video-${userId}`);
    if (videoContainer) {
      videoContainer.remove();
    }
  });

  socket.on('translated-text', ({ original, translated, from }) => {
    console.log('📥 Translation:', translated);
    
    const subtitle = document.getElementById(`subtitle-${from}`);
    if (subtitle) {
      subtitle.textContent = translated;
      subtitle.classList.add('active');
      setTimeout(() => subtitle.classList.remove('active'), 5000);
    }

    addTranscriptionItem(original, translated);
  });

  // Speech recognition
  function initializeSpeechRecognition() {
    console.log('🎙️ Initializing speech recognition...');
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('❌ Speech recognition not supported');
      alert('Speech recognition not supported in this browser. Please use Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    // Set language
    const langMap = {
      'te': 'te-IN', 'hi': 'hi-IN', 'ta': 'ta-IN', 'kn': 'kn-IN',
      'ml': 'ml-IN', 'mr': 'mr-IN', 'bn': 'bn-IN', 'gu': 'gu-IN',
      'pa': 'pa-IN', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
      'it': 'it-IT', 'pt': 'pt-PT', 'ru': 'ru-RU', 'zh': 'zh-CN',
      'ja': 'ja-JP', 'ko': 'ko-KR', 'ar': 'ar-SA', 'en': 'en-US'
    };
    recognition.lang = langMap[speakingLanguage] || 'en-US';

    console.log('✅ Speech recognition language:', recognition.lang);

    recognition.onstart = () => {
      console.log('✅ Speech recognition started');
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          console.log('🎤 Speech recognized:', transcript);
          
          // Send transcription
          socket.emit('transcription', {
            roomCode,
            roomId: roomCode,
            text: transcript,
            language: speakingLanguage
          });

          // Show local subtitle
          localSubtitle.textContent = transcript;
          localSubtitle.classList.add('active');
          setTimeout(() => localSubtitle.classList.remove('active'), 5000);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      
      if (event.error === 'aborted') {
        console.log('⚠️ Recognition aborted, will restart if still listening');
      } else if (event.error === 'no-speech') {
        console.log('⚠️ No speech detected, continuing to listen...');
      } else if (event.error === 'audio-capture') {
        console.error('❌ No microphone found or permission denied');
        isRecognizing = false;
        toggleTranscriptionBtn.classList.remove('active');
        transcriptionPanel.classList.remove('active');
        alert('Microphone not found or not working. Please check your microphone.');
      } else if (event.error === 'not-allowed') {
        isRecognizing = false;
        toggleTranscriptionBtn.classList.remove('active');
        transcriptionPanel.classList.remove('active');
        alert('Microphone permission denied. Please allow microphone access.');
      }
    };

    recognition.onend = () => {
      console.log('⏹️ Speech recognition ended');
      if (isRecognizing) {
        console.log('🔄 Auto-restarting speech recognition...');
        setTimeout(() => {
          try {
            recognition.start();
            console.log('✅ Speech recognition restarted');
          } catch (error) {
            console.error('Error restarting:', error);
            if (!error.message || !error.message.includes('already started')) {
              isRecognizing = false;
              toggleTranscriptionBtn.classList.remove('active');
              transcriptionPanel.classList.remove('active');
            }
          }
        }, 100);
      }
    };
  }

  // Control buttons
  toggleVideoBtn.addEventListener('click', () => {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      toggleVideoBtn.classList.toggle('active');
    }
  });

  toggleAudioBtn.addEventListener('click', () => {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      toggleAudioBtn.classList.toggle('active');
      
      // Stop recognition if mic disabled
      if (!audioTrack.enabled && isRecognizing) {
        recognition.stop();
        isRecognizing = false;
        toggleTranscriptionBtn.classList.remove('active');
        transcriptionPanel.classList.remove('active');
      }
    }
  });

  toggleTranscriptionBtn.addEventListener('click', () => {
    if (!recognition) {
      alert('Speech recognition not available');
      return;
    }
    
    // Check microphone
    const audioTrack = localStream?.getAudioTracks()[0];
    if (!audioTrack || !audioTrack.enabled) {
      alert('Please enable your microphone first (click 🎤 button)');
      return;
    }
    
    isRecognizing = !isRecognizing;
    toggleTranscriptionBtn.classList.toggle('active');
    transcriptionPanel.classList.toggle('active');

    if (isRecognizing) {
      console.log('🎙️ Starting speech recognition...');
      try {
        recognition.start();
      } catch (error) {
        console.error('Error starting:', error);
        isRecognizing = false;
        toggleTranscriptionBtn.classList.remove('active');
        transcriptionPanel.classList.remove('active');
      }
    } else {
      console.log('⏹️ Stopping speech recognition');
      recognition.stop();
    }
  });

  leaveBtn.addEventListener('click', () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    peers.forEach(peer => peer.close());
    if (recognition) recognition.stop();
    socket.disconnect();
    sessionStorage.clear();
    window.location.href = '/';
  });

  // Also handle bottom leave button
  const leaveBtnBottom = document.getElementById('leave-btn-bottom');
  if (leaveBtnBottom) {
    leaveBtnBottom.addEventListener('click', () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      peers.forEach(peer => peer.close());
      if (recognition) recognition.stop();
      socket.disconnect();
      sessionStorage.clear();
      window.location.href = '/';
    });
  }

  function addTranscriptionItem(original, translated) {
    const item = document.createElement('div');
    item.className = 'transcription-item';
    
    const originalDiv = document.createElement('div');
    originalDiv.className = 'original';
    originalDiv.textContent = `Original: ${original}`;
    
    const translatedDiv = document.createElement('div');
    translatedDiv.className = 'translated';
    translatedDiv.textContent = translated;
    
    item.appendChild(originalDiv);
    item.appendChild(translatedDiv);
    transcriptionLog.insertBefore(item, transcriptionLog.firstChild);

    if (transcriptionLog.children.length > 20) {
      transcriptionLog.removeChild(transcriptionLog.lastChild);
    }
  }

  // Initialize
  await init();
  console.log('✅ Room page ready!');
});
