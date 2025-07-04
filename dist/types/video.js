"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MEDIA_CONSTRAINTS = exports.DEFAULT_VIDEO_CONFIG = exports.DEFAULT_ICE_SERVERS = void 0;
exports.DEFAULT_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
];
exports.DEFAULT_VIDEO_CONFIG = {
    iceServers: exports.DEFAULT_ICE_SERVERS,
    timeout: 30000, // 30 seconds
    retryAttempts: 3
};
exports.DEFAULT_MEDIA_CONSTRAINTS = {
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
//# sourceMappingURL=video.js.map