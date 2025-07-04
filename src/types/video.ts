export interface VideoCallState {
  isInCall: boolean;
  isCallActive: boolean;
  isCallInitiator: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callId: string | null;
  opponentId: string | null;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'failed' | 'ended';
  errorMessage: string | null;
}

export interface VideoCallMessage {
  type: 'video_call_request' | 'video_call_accepted' | 'video_call_rejected' | 'video_call_ended' | 'video_offer' | 'video_answer' | 'ice_candidate';
  payload: any;
  from: string;
  to: string;
  callId?: string;
  timestamp?: number;
}

export interface VideoCallConfig {
  iceServers: RTCIceServer[];
  timeout: number;
  retryAttempts: number;
}

export interface MediaConstraints {
  video: boolean | MediaTrackConstraints;
  audio: boolean | MediaTrackConstraints;
}

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
];

export const DEFAULT_VIDEO_CONFIG: VideoCallConfig = {
  iceServers: DEFAULT_ICE_SERVERS,
  timeout: 30000, // 30 seconds
  retryAttempts: 3
};

export const DEFAULT_MEDIA_CONSTRAINTS: MediaConstraints = {
  video: {
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 },
    frameRate: { ideal: 30, min: 15 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

export type VideoCallError = 
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_FOUND'
  | 'CONSTRAINT_NOT_SATISFIED'
  | 'NOT_SUPPORTED'
  | 'CONNECTION_FAILED'
  | 'TIMEOUT'
  | 'PEER_DISCONNECTED'
  | 'UNKNOWN_ERROR';

export interface VideoCallErrorInfo {
  type: VideoCallError;
  message: string;
  details?: any;
} 