import { Button } from "../Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useState, useEffect } from "react";

interface VideoCallDisplayProps {
    isInCall: boolean;
    isCallActive: boolean;
    isMuted: boolean;
    isVideoEnabled: boolean;
    remoteStream: MediaStream | null;
    localStream: MediaStream | null;
    localVideoRef: React.RefObject<HTMLVideoElement>;
    remoteVideoRef: React.RefObject<HTMLVideoElement>;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    onEndCall: () => void;
}

export const VideoCallDisplay = ({
    isInCall,
    isCallActive,
    isMuted,
    isVideoEnabled,
    remoteStream,
    localStream,
    localVideoRef,
    remoteVideoRef,
    onToggleMute,
    onToggleVideo,
    onEndCall
}: VideoCallDisplayProps) => {
    const [spinAngle, setSpinAngle] = useState(0);

    // Simple spinning animation
    useEffect(() => {
        if (!remoteStream) {
            const interval = setInterval(() => {
                setSpinAngle(prev => (prev + 10) % 360);
            }, 50);
            return () => clearInterval(interval);
        }
    }, [remoteStream]);

    // Attach streams to video elements
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteVideoRef, remoteStream]);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localVideoRef, localStream]);

    if (!isInCall) {
        return null;
    }

    return (
        <div className="mt-2 min-w-0">
            <Card className="overflow-hidden">
                <CardHeader className="pb-1 px-3 py-2">
                    <CardTitle className="text-center text-xs">Video Call</CardTitle>
                    {!isCallActive && (
                        <p className="text-xs text-gray-400 text-center">Connecting...</p>
                    )}
                    {isCallActive && (
                        <p className="text-xs text-green-500 text-center">Connected</p>
                    )}
                    <div className="text-xs text-center">
                        Local: {localStream ? '✅' : '❌'} | Remote: {remoteStream ? '✅' : '❌'}
                    </div>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-3">
                    {/* Video container - responsive layout */}
                    <div className="space-y-1.5">
                        {/* Remote video */}
                        <div className="relative">
                            <div className="text-xs text-gray-400 mb-1">Opponent</div>
                            <div className="relative w-full h-20 md:h-32 bg-black rounded overflow-hidden">
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    muted={false}
                                    className="w-full h-full object-cover"
                                    onError={(e) => console.error('Remote video error:', e)}
                                />
                                {!remoteStream && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-xs bg-black/60">
                                        <div
                                            className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mb-1"
                                            style={{ transform: `rotate(${spinAngle}deg)` }}
                                        />
                                        Waiting...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Local video */}
                        <div className="relative">
                            <div className="text-xs text-gray-400 mb-1">You</div>
                            <div className="relative w-full h-20 md:h-32 bg-black rounded overflow-hidden">
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                    onError={(e) => console.error('Local video error:', e)}
                                />
                                {!isVideoEnabled && (
                                    <div className="absolute inset-0 flex items-center justify-center text-white text-xs bg-black/60">
                                        Camera Off
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex justify-center space-x-1.5 md:space-x-2 mt-2 md:mt-3">
                        <Button
                            onClick={onToggleMute}
                            variant={isMuted ? "danger" : "secondary"}
                            size="icon"
                            className="h-7 w-7 md:h-8 md:w-8"
                        >
                            {isMuted ? <MicOff className="h-3 w-3 md:h-4 md:w-4" /> : <Mic className="h-3 w-3 md:h-4 md:w-4" />}
                        </Button>
                        
                        <Button
                            onClick={onToggleVideo}
                            variant={!isVideoEnabled ? "secondary" : "secondary"}
                            size="icon"
                            className="h-7 w-7 md:h-8 md:w-8"
                        >
                            {isVideoEnabled ? <Video className="h-3 w-3 md:h-4 md:w-4" /> : <VideoOff className="h-3 w-3 md:h-4 md:w-4" />}
                        </Button>
                        
                        <Button
                            onClick={onEndCall}
                            variant="danger"
                            size="icon"
                            className="h-7 w-7 md:h-8 md:w-8"
                        >
                            <PhoneOff className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}; 