import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  VideoCallState, 
  VideoCallMessage, 
  VideoCallConfig, 
  MediaConstraints,
  VideoCallError,
  VideoCallErrorInfo,
  DEFAULT_VIDEO_CONFIG,
  DEFAULT_MEDIA_CONSTRAINTS
} from '@/types/video';

// Dynamic import for SimplePeer to avoid bundling issues
let SimplePeer: any = null;

const loadSimplePeer = async (): Promise<any> => {
  if (!SimplePeer) {
    try {
      const module = await import('simple-peer-light');
      SimplePeer = module.default || module;
    } catch (error) {
      console.error('Failed to load SimplePeer:', error);
      throw new Error('WebRTC library not available');
    }
  }
  return SimplePeer;
};

export const useVideoCall = (
  socket: WebSocket | null, 
  userId: string, 
  config: Partial<VideoCallConfig> = {}
) => {
  const finalConfig = { ...DEFAULT_VIDEO_CONFIG, ...config };
  
  const [videoCallState, setVideoCallState] = useState<VideoCallState>({
    isInCall: false,
    isCallActive: false,
    isCallInitiator: false,
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoEnabled: true,
    callId: null,
    opponentId: null,
    connectionStatus: 'idle',
    errorMessage: null
  });

  const peerRef = useRef<any | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Destroy peer connection
    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying peer:', error);
      }
      peerRef.current = null;
    }

    // Stop media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    retryCountRef.current = 0;
  }, []);

  // Error handler
  const handleError = useCallback((error: VideoCallError, message: string, details?: any) => {
    console.error('Video call error:', error, message, details);
    
    const errorInfo: VideoCallErrorInfo = {
      type: error,
      message,
      details
    };

    setVideoCallState(prev => ({
      ...prev,
      connectionStatus: 'failed',
      errorMessage: message
    }));

    cleanup();
  }, [cleanup]);

  // Initialize local media stream
  const initializeLocalStream = useCallback(async (constraints: MediaConstraints = DEFAULT_MEDIA_CONSTRAINTS): Promise<MediaStream> => {
    try {
      // Check if media devices are supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      
      setVideoCallState(prev => ({ 
        ...prev, 
        localStream: stream,
        errorMessage: null 
      }));

      // Attach to video element if available
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(error => {
          console.warn('Failed to play local video:', error);
        });
      }

      console.log('Local stream initialized successfully');
      return stream;
    } catch (error: any) {
      console.error('Error initializing local stream:', error);
      
      let errorType: VideoCallError = 'UNKNOWN_ERROR';
      let errorMessage = 'Failed to access camera and microphone';

      if (error.name === 'NotAllowedError') {
        errorType = 'PERMISSION_DENIED';
        errorMessage = 'Camera and microphone access denied. Please allow access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorType = 'DEVICE_NOT_FOUND';
        errorMessage = 'Camera or microphone not found. Please check your devices.';
      } else if (error.name === 'ConstraintNotSatisfiedError') {
        errorType = 'CONSTRAINT_NOT_SATISFIED';
        errorMessage = 'Camera or microphone constraints not satisfied.';
      } else if (error.name === 'NotSupportedError') {
        errorType = 'NOT_SUPPORTED';
        errorMessage = 'Video calling is not supported in this browser.';
      }

      handleError(errorType, errorMessage, error);
      throw error;
    }
  }, [handleError]);

  // Create peer connection
  const createPeer = useCallback(async (
    initiator: boolean, 
    stream: MediaStream, 
    callId: string, 
    opponentId: string
  ): Promise<any> => {
    try {
      const SimplePeerClass = await loadSimplePeer();
      
      const peer = new SimplePeerClass({
        initiator,
        stream,
        trickle: false,
        config: { 
          iceServers: finalConfig.iceServers,
          iceCandidatePoolSize: 10
        }
      });

      // Handle signaling
      peer.on('signal', (data: any) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          const message: VideoCallMessage = {
            type: initiator ? 'video_offer' : 'video_answer',
            payload: data,
            from: userId,
            to: opponentId,
            callId: callId,
            timestamp: Date.now()
          };
          socket.send(JSON.stringify(message));
        }
      });

      // Handle remote stream
      peer.on('stream', (remoteStream: MediaStream) => {
        console.log('Remote stream received');
        setVideoCallState(prev => ({ 
          ...prev, 
          remoteStream,
          connectionStatus: 'connected',
          isCallActive: true,
          errorMessage: null
        }));

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(error => {
            console.warn('Failed to play remote video:', error);
          });
        }
      });

      // Handle connection events
      peer.on('connect', () => {
        console.log('Peer connection established');
        setVideoCallState(prev => ({ 
          ...prev, 
          connectionStatus: 'connected',
          isCallActive: true,
          errorMessage: null
        }));
        
        // Clear timeout on successful connection
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      });

      peer.on('close', () => {
        console.log('Peer connection closed');
        setVideoCallState(prev => ({ 
          ...prev, 
          connectionStatus: 'ended',
          isCallActive: false
        }));
        cleanup();
      });

      peer.on('error', (error: Error) => {
        console.error('Peer connection error:', error);
        handleError('CONNECTION_FAILED', 'Video call connection failed', error);
      });

      peerRef.current = peer;
      return peer;
    } catch (error: any) {
      console.error('Error creating peer:', error);
      handleError('CONNECTION_FAILED', 'Failed to create video connection', error);
      throw error;
    }
  }, [socket, userId, finalConfig.iceServers, cleanup, handleError]);

  // Start a video call
  const startCall = useCallback(async (opponentId: string): Promise<void> => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      handleError('CONNECTION_FAILED', 'WebSocket connection not available');
      return;
    }

    try {
      // Initialize local stream
      const stream = await initializeLocalStream();
      
      // Generate call ID
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      setVideoCallState(prev => ({
        ...prev,
        isInCall: true,
        isCallInitiator: true,
        callId,
        opponentId,
        connectionStatus: 'connecting',
        errorMessage: null
      }));

      // Send call request BEFORE creating peer; peer will be created after acceptance
      const message: VideoCallMessage = {
        type: 'video_call_request',
        payload: { callId },
        from: userId,
        to: opponentId,
        timestamp: Date.now()
      };
      socket.send(JSON.stringify(message));

      // We will create the peer after opponent accepts the call (see handleVideoMessage)

      // Set timeout for call acceptance
      timeoutRef.current = setTimeout(() => {
        if (videoCallState.connectionStatus === 'connecting') {
          handleError('TIMEOUT', 'Call request timed out. No response from opponent.');
        }
      }, finalConfig.timeout);

    } catch (error: any) {
      console.error('[useVideoCall] Error starting call:', error);
      handleError('UNKNOWN_ERROR', 'Failed to start video call', error);
    }
  }, [socket, initializeLocalStream, handleError, videoCallState.connectionStatus]);

  // Accept incoming call
  const acceptCall = useCallback(async (callId: string, initiatorId: string): Promise<void> => {
    try {
      console.log('Accepting incoming call:', callId);
      
      setVideoCallState(prev => ({
        ...prev,
        isInCall: true,
        isCallInitiator: false,
        callId,
        opponentId: initiatorId,
        connectionStatus: 'connecting',
        errorMessage: null
      }));

      // Initialize local stream
      const stream = await initializeLocalStream();
      
      // Send acceptance message (peer will be created after receiving offer)
      if (socket && socket.readyState === WebSocket.OPEN) {
        const message: VideoCallMessage = {
          type: 'video_call_accepted',
          payload: { callId },
          from: userId,
          to: initiatorId,
          timestamp: Date.now()
        };
        socket.send(JSON.stringify(message));
      }

    } catch (error: any) {
      console.error('Error accepting call:', error);
      handleError('UNKNOWN_ERROR', 'Failed to accept video call', error);
      
      // Send rejection if we can't accept
      if (socket && socket.readyState === WebSocket.OPEN) {
        const message: VideoCallMessage = {
          type: 'video_call_rejected',
          payload: { callId },
          from: userId,
          to: initiatorId,
          timestamp: Date.now()
        };
        socket.send(JSON.stringify(message));
      }
    }
  }, [socket, initializeLocalStream, handleError]);

  // Reject incoming call
  const rejectCall = useCallback((callId: string, initiatorId: string): void => {
    console.log('Rejecting incoming call:', callId);
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      const message: VideoCallMessage = {
        type: 'video_call_rejected',
        payload: { callId },
        from: userId,
        to: initiatorId,
        timestamp: Date.now()
      };
      socket.send(JSON.stringify(message));
    }
  }, [socket, userId]);

  // End current call
  const endCall = useCallback((): void => {
    console.log('Ending video call');
    
    // Notify opponent
    if (socket && socket.readyState === WebSocket.OPEN && videoCallState.callId && videoCallState.opponentId) {
      const message: VideoCallMessage = {
        type: 'video_call_ended',
        payload: { callId: videoCallState.callId },
        from: userId,
        to: videoCallState.opponentId,
        timestamp: Date.now()
      };
      socket.send(JSON.stringify(message));
    }

    // Reset state
    setVideoCallState({
      isInCall: false,
      isCallActive: false,
      isCallInitiator: false,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoEnabled: true,
      callId: null,
      opponentId: null,
      connectionStatus: 'idle',
      errorMessage: null
    });

    cleanup();
  }, [socket, userId, videoCallState.callId, videoCallState.opponentId, cleanup]);

  // Toggle mute
  const toggleMute = useCallback((): void => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      const newMutedState = !videoCallState.isMuted;
      
      audioTracks.forEach(track => {
        track.enabled = !newMutedState;
      });
      
      setVideoCallState(prev => ({ ...prev, isMuted: newMutedState }));
    }
  }, [videoCallState.isMuted]);

  // Toggle video
  const toggleVideo = useCallback((): void => {
    if (mediaStreamRef.current) {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      const newVideoState = !videoCallState.isVideoEnabled;
      
      videoTracks.forEach(track => {
        track.enabled = newVideoState;
      });
      
      setVideoCallState(prev => ({ ...prev, isVideoEnabled: newVideoState }));
    }
  }, [videoCallState.isVideoEnabled]);

  // Handle incoming video call messages
  const handleVideoMessage = useCallback((message: VideoCallMessage): void => {
    switch (message.type) {
      case 'video_call_accepted':
        if (videoCallState.isCallInitiator && videoCallState.callId && !peerRef.current) {
          if (mediaStreamRef.current) {
            createPeer(true, mediaStreamRef.current, videoCallState.callId, message.from)
              .catch(err => console.error('Error creating peer after acceptance', err));
          }
        }
        break;
        
      case 'video_call_rejected':
        handleError('PEER_DISCONNECTED', 'Call was rejected by opponent');
        break;
        
      case 'video_call_ended':
        console.log('Call ended by opponent, performing cleanup');
        // Reset state completely when opponent ends the call
        setVideoCallState({
          isInCall: false,
          isCallActive: false,
          isCallInitiator: false,
          localStream: null,
          remoteStream: null,
          isMuted: false,
          isVideoEnabled: true,
          callId: null,
          opponentId: null,
          connectionStatus: 'idle',
          errorMessage: null
        });
        cleanup();
        break;
        
      case 'video_offer':
        if (!videoCallState.isCallInitiator && videoCallState.callId) {
          const ensurePeer = async () => {
            if (!peerRef.current && mediaStreamRef.current) {
              try {
                await createPeer(false, mediaStreamRef.current, videoCallState.callId!, message.from);
              } catch (err) {
                console.error('Error creating peer on offer', err);
              }
            }
            if (peerRef.current) {
              peerRef.current.signal(message.payload);
            }
          };
          ensurePeer();
        }
        break;
        
      case 'video_answer':
        if (videoCallState.isCallInitiator && peerRef.current) {
          peerRef.current.signal(message.payload);
        }
        break;
        
      case 'ice_candidate':
        if (peerRef.current) {
          peerRef.current.signal(message.payload);
        }
        break;
    }
  }, [videoCallState.isCallInitiator, videoCallState.callId, cleanup, createPeer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    videoCallState,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    handleVideoMessage,
    localVideoRef,
    remoteVideoRef,
    initializeLocalStream
  };
}; 