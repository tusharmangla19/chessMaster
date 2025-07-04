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
export declare const DEFAULT_ICE_SERVERS: RTCIceServer[];
export declare const DEFAULT_VIDEO_CONFIG: VideoCallConfig;
export declare const DEFAULT_MEDIA_CONSTRAINTS: MediaConstraints;
export type VideoCallError = 'PERMISSION_DENIED' | 'DEVICE_NOT_FOUND' | 'CONSTRAINT_NOT_SATISFIED' | 'NOT_SUPPORTED' | 'CONNECTION_FAILED' | 'TIMEOUT' | 'PEER_DISCONNECTED' | 'UNKNOWN_ERROR';
export interface VideoCallErrorInfo {
    type: VideoCallError;
    message: string;
    details?: any;
}
//# sourceMappingURL=video.d.ts.map