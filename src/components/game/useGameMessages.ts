import { useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { MESSAGE_TYPES, VIDEO_MESSAGE_TYPES, ALL_VIDEO_TYPES } from './types';
import { GameState, GameActions } from './types';

interface UseGameMessagesProps {
    socket: WebSocket | null;
    chessRef: React.MutableRefObject<Chess>;
    gameState: GameState;
    gameActions: GameActions;
    handleVideoMessage: (message: any) => void;
    endVideoCall: () => void;
}

export const useGameMessages = ({
    socket,
    chessRef,
    gameState,
    gameActions,
    handleVideoMessage,
    endVideoCall
}: UseGameMessagesProps) => {
    const {
        setStarted,
        setPlayerColor,
        setWaitingForOpponent,
        setCreatedRoomId,
        setOpponentConnected,
        setOpponentDisconnected,
        setDisconnectTimer,
        setMoveCount,
        setGameMode,
        showTemporaryError,
        stopLoading,
        resetGame,
        clearDisconnectTimer,
        startDisconnectTimer,
        setIncomingCall,
        setHasCheckedResume,
        setBoardFen,
        setOpponentInfo
    } = gameActions;

    const handleVideoCallMessage = (message: any) => {
        handleVideoMessage(message);
        
        if (message.type === VIDEO_MESSAGE_TYPES.VIDEO_CALL_REQUEST) {
            setIncomingCall({
                callId: message.payload.callId,
                from: message.from
            });
        }
        
        if ([VIDEO_MESSAGE_TYPES.VIDEO_CALL_ACCEPTED, VIDEO_MESSAGE_TYPES.VIDEO_CALL_REJECTED, VIDEO_MESSAGE_TYPES.VIDEO_CALL_ENDED].includes(message.type)) {
            setIncomingCall(null);
        }
    };

    const handleGameMessage = (message: any) => {
        console.log('[GameMessages] handleGameMessage called with:', message);
        switch (message.type) {
            case MESSAGE_TYPES.INIT_GAME:
                stopLoading();
                setStarted(true);
                setPlayerColor(message.payload.color);
                setWaitingForOpponent(false);
                setHasCheckedResume(true);
                // Set opponent info if provided
                if (message.payload.opponentInfo) {
                    setOpponentInfo(message.payload.opponentInfo);
                }
                // Set initial board FEN
                setBoardFen(chessRef.current.fen());
                break;

            case MESSAGE_TYPES.MOVE:
                try {
                    console.log('[GameMessages] Processing move:', message.payload.move);
                    chessRef.current.move(message.payload.move);
                    setMoveCount((prev: number) => prev + 1);
                    
                    // THIS IS THE KEY FIX: Update the board FEN state to trigger UI re-render
                    setBoardFen(chessRef.current.fen());
                    
                    console.log('[GameMessages] Move applied, new FEN:', chessRef.current.fen());
                } catch (error) {
                    console.error('[GameMessages] Error applying move:', error);
                    showTemporaryError("Error applying move from server");
                }
                break;

            case MESSAGE_TYPES.RESUME_GAME:
                const { color, fen, moveHistory, opponentConnected, waitingForOpponent, opponentInfo } = message.payload;
                const chess = new Chess();
                
                if (fen) {
                    chess.load(fen);
                } else if (moveHistory?.length > 0) {
                    moveHistory.forEach((m: any) => {
                        chess.move({ 
                            from: m.from, 
                            to: m.to, 
                            promotion: m.san.endsWith('=Q') ? 'q' : undefined 
                        });
                    });
                }
                
                chessRef.current = chess;
                setPlayerColor(color);
                setStarted(true);
                setWaitingForOpponent(!!waitingForOpponent);
                setOpponentConnected(!!opponentConnected);
                setMoveCount(moveHistory ? moveHistory.length : 0);
                
                // Set opponent info if provided
                if (opponentInfo) {
                    setOpponentInfo(opponentInfo);
                }
                
                // Determine game mode based on opponent presence
                // If no opponent connected and not waiting for opponent, it's single player
                const gameMode = (!opponentConnected && !waitingForOpponent) ? 'single_player' : 'multiplayer';
                setGameMode(gameMode);
                
                stopLoading();
                setHasCheckedResume(true);
                // Update board FEN after resume
                setBoardFen(chessRef.current.fen());
                break;

            case MESSAGE_TYPES.GAME_OVER:
                const { winner, reason } = message.payload;
                const gameOverMessage = winner 
                    ? `Game Over! ${winner} wins by ${reason}!`
                    : `Game Over! Draw by ${reason}!`;
                showTemporaryError(gameOverMessage);
                stopLoading();
                // Clean up video call when game ends
                endVideoCall();
                break;

            case MESSAGE_TYPES.ERROR:
            case MESSAGE_TYPES.ROOM_NOT_FOUND:
                showTemporaryError(message.payload.message);
                stopLoading();
                setHasCheckedResume(true);
                break;

            case MESSAGE_TYPES.WAITING_FOR_OPPONENT:
                setWaitingForOpponent(true);
                stopLoading();
                setHasCheckedResume(true);
                break;

            case MESSAGE_TYPES.ROOM_CREATED:
                setCreatedRoomId(message.payload.roomId);
                setWaitingForOpponent(true);
                stopLoading();
                setHasCheckedResume(true);
                break;

            case MESSAGE_TYPES.ROOM_JOINED:
                setStarted(true);
                setPlayerColor(message.payload.color);
                setWaitingForOpponent(false);
                stopLoading();
                setHasCheckedResume(true);
                // Set opponent info if provided
                if (message.payload.opponentInfo) {
                    setOpponentInfo(message.payload.opponentInfo);
                }
                // Set initial board FEN for room games
                setBoardFen(chessRef.current.fen());
                break;

            case MESSAGE_TYPES.OPPONENT_LEFT:
                showTemporaryError('Opponent left the match. Redirecting to menu...');
                // Clean up video call when opponent leaves
                endVideoCall();
                setTimeout(() => {
                    resetGame();
                    stopLoading();
                }, 3000);
                break;

            case MESSAGE_TYPES.OPPONENT_DISCONNECTED:
                startDisconnectTimer();
                stopLoading();
                break;

            case MESSAGE_TYPES.OPPONENT_RECONNECTED:
                setOpponentDisconnected(false);
                setDisconnectTimer(0);
                clearDisconnectTimer();
                stopLoading();
                break;

            case MESSAGE_TYPES.GAME_ENDED_DISCONNECT:
                setOpponentDisconnected(false);
                setDisconnectTimer(0);
                clearDisconnectTimer();
                showTemporaryError('Game ended due to opponent disconnection. Redirecting to menu...');
                // Clean up video call when game ends due to disconnect
                endVideoCall();
                setTimeout(() => {
                    resetGame();
                    stopLoading();
                }, 3000);
                break;

            case MESSAGE_TYPES.MATCHMAKING_CANCELLED:
                stopLoading();
                setHasCheckedResume(true);
                break;

            case MESSAGE_TYPES.NO_GAME_TO_RESUME:
                console.log('[GameMessages] Handling NO_GAME_TO_RESUME');
                setHasCheckedResume(true);
                stopLoading();
                break;

            default:
                showTemporaryError(`[GameMessages] Unhandled message type: ${message.type}`);
                break;
        }
    };

    useEffect(() => {
        if (!socket) return;

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('[WebSocket] Received message from server:', message);
                console.log('[WebSocket] Message type:', message.type);
                if (ALL_VIDEO_TYPES.includes(message.type)) {
                    console.log('[WebSocket] Handling video message');
                    handleVideoCallMessage(message);
                } else {
                    console.log('[WebSocket] Handling game message');
                    handleGameMessage(message);
                }
            } catch (error) {
                console.error('[WebSocket] Error processing message:', error);
                showTemporaryError("Error processing server message");
            }
        };
    }, [socket, handleVideoMessage]);
};