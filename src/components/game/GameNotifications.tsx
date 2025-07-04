import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Phone, PhoneOff, AlertTriangle, X } from "lucide-react";

interface GameNotificationsProps {
    errorMessage: string | null;
    incomingCall: { callId: string; from: string } | null;
    onAcceptCall: () => void;
    onRejectCall: () => void;
    onDismissError?: () => void;
}

export const GameNotifications = ({
    errorMessage,
    incomingCall,
    onAcceptCall,
    onRejectCall,
    onDismissError
}: GameNotificationsProps) => {
    return (
        <>
            {/* Error Message */}
            {errorMessage && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-4">
                    <Card className="bg-red-950/90 border-red-800 text-red-100 backdrop-blur-md shadow-2xl max-w-sm">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-2">
                                    <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                                    <span className="text-sm font-medium">{errorMessage}</span>
                                </div>
                                {onDismissError && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onDismissError}
                                        className="h-6 w-6 p-0 text-red-300 hover:text-red-100 hover:bg-red-800/50"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Incoming Call Notification */}
            {incomingCall && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
                    <Card className="bg-gradient-to-r from-blue-950/95 to-purple-950/95 border-blue-800 text-white backdrop-blur-md shadow-2xl">
                        <CardContent className="p-6">
                            <div className="text-center space-y-4">
                                {/* Call icon with animation */}
                                <div className="flex justify-center">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                                        <div className="relative bg-blue-600 p-3 rounded-full">
                                            <Phone className="h-6 w-6 text-white" />
                                        </div>
                                    </div>
                                </div>

                                {/* Call details */}
                                <div className="space-y-2">
                                    <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                                        Incoming Video Call
                                    </Badge>
                                    <p className="text-lg font-semibold">
                                        {incomingCall.from}
                                    </p>
                                    <p className="text-sm text-blue-100">
                                        wants to start a video call
                                    </p>
                                </div>

                                {/* Action buttons */}
                                <div className="flex justify-center space-x-3">
                                    <Button 
                                        onClick={onRejectCall}
                                        variant="outline"
                                        size="lg"
                                        className="bg-red-600/80 hover:bg-red-600 border-red-500 text-white hover:text-white px-6"
                                    >
                                        <PhoneOff className="h-4 w-4 mr-2" />
                                        Decline
                                    </Button>
                                    <Button 
                                        onClick={onAcceptCall}
                                        size="lg"
                                        className="bg-green-600 hover:bg-green-700 text-white px-6 shadow-lg"
                                    >
                                        <Phone className="h-4 w-4 mr-2" />
                                        Accept
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}; 