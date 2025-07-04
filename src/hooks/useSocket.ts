import { useEffect, useState, useRef } from "react"
import { useUser } from '@clerk/nextjs';

// Use local server for development
const WS_URL = process.env.NODE_ENV === 'production' 
    ? "wss://chessmasterbackend-production-f5b3.up.railway.app"
    : "ws://localhost:8081";

export const useSocket = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const { user, isLoaded } = useUser();
    
    console.log('[useSocket] Clerk state:', { isLoaded, user: !!user, userId: user?.id });

    useEffect(() => {
        // Only create a new WebSocket if one doesn't exist and Clerk is loaded
        if (!wsRef.current && isLoaded) {
            console.log("Creating new WebSocket connection to:", WS_URL);
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;
            
            ws.onopen = () => {
                console.log("WebSocket connected");
                console.log("User available:", !!user);
                console.log("User ID:", user?.id);
                setSocket(ws);
                // Send Clerk user ID as auth message
                if (user?.id) {
                    console.log("Sending auth message with clerkId:", user.id);
                    ws.send(JSON.stringify({ type: 'auth', clerkId: user.id }));
                } else {
                    console.log("No user ID available, cannot send auth message");
                }
            }

            ws.onclose = () => {
                console.log("WebSocket disconnected");
                setSocket(null);
                wsRef.current = null;
            }

            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                setSocket(null);
                wsRef.current = null;
            }
        }

        return () => {
            // Cleanup function - close WebSocket when component unmounts
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                console.log("Closing WebSocket connection");
                wsRef.current.close();
                wsRef.current = null;
                setSocket(null);
            }
        }
    }, [user, isLoaded]);

    return socket;  
} 
