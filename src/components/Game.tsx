'use client';

import { useEffect, useRef } from "react";
import { Chess } from 'chess.js';
import { useSocket } from "@/hooks/useSocket";
import { useVideoCall } from "@/hooks/useVideoCall";
import {
    useGameState,
    useGameMessages,
    useGameActions,
    WaitingScreen,
    GameBoard,
    GameNotifications,
    LoadingScreen,
    DifficultySelector
} from "./game/index";
import { ModernGameMenu } from "./game/ModernGameMenu";
import { AIDifficulty } from "./game/types";

export const Game = () => {
    const socket = useSocket();
    const chessRef = useRef(new Chess());
    
    // Game state management
    const gameState = useGameState();
    const {
        gameMode,
        roomId,
        createdRoomId,
        started,
        playerColor,
        moveCount,
        waitingForOpponent,
        opponentConnected,
        opponentDisconnected,
        disconnectTimer,
        errorMessage,
        isLoading,
        hasCheckedResume,
        incomingCall,
        boardFen,
        selectedDifficulty,
        opponentInfo,
        setRoomId,
        setErrorMessage,
        resetGame,
        showTemporaryError,
        setWaitingForOpponent,
        setSelectedDifficulty
    } = gameState;
    
    console.log('[Game Render]', { isLoading, hasCheckedResume, gameMode });

    // Video call state
    const {
        videoCallState,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        handleVideoMessage,
        localVideoRef,
        remoteVideoRef
    } = useVideoCall(socket, 'player');

    // Game actions
    const gameActions = useGameActions({
        socket,
        gameActions: gameState,
        roomId,
        endVideoCall: endCall
    });

    // Initialize loading timeout
    useEffect(() => {
        if (socket) {
            gameState.setIsLoading(true);
            gameState.setHasCheckedResume(false);
        }
    }, [socket]);

    // Handle game messages
    useGameMessages({
        socket,
        chessRef,
        gameState,
        gameActions: gameState,
        handleVideoMessage,
        endVideoCall: endCall
    });

    // Computed values
    const isGameDisabled = gameMode === 'single_player' 
        ? waitingForOpponent || opponentDisconnected  // For single player: only check waiting and disconnect
        : waitingForOpponent || !opponentConnected || opponentDisconnected;  // For multiplayer: check all conditions
    const opponentId = 'opponent';

    // Video call handlers
    const handleStartVideoCall = () => {
        console.log('[Game] Starting video call with opponentId:', opponentId, 'started:', started);
        if (started && opponentId) {
            console.log('[Game] Calling startCall...');
            startCall(opponentId);
        } else {
            console.log('[Game] Cannot start video call - started:', started, 'opponentId:', opponentId);
        }
    };

    const handleAcceptIncomingCall = () => {
        console.log('[Game] Accepting incoming call:', incomingCall);
        if (incomingCall) {
            console.log('[Game] Calling acceptCall...');
            acceptCall(incomingCall.callId, incomingCall.from);
            gameState.setIncomingCall(null);
        }
    };

    const handleRejectIncomingCall = () => {
        console.log('[Game] Rejecting incoming call:', incomingCall);
        if (incomingCall) {
            console.log('[Game] Calling rejectCall...');
            rejectCall(incomingCall.callId, incomingCall.from);
            gameState.setIncomingCall(null);
        }
    };

    const handleDismissError = () => {
        setErrorMessage(null);
    };

    const handleCopyRoomCode = () => {
        if (createdRoomId) {
            navigator.clipboard.writeText(createdRoomId);
        }
    };

    const handleCancelWaiting = () => {
        gameActions.cancelMatchmaking();
    };

    // Difficulty selection handlers
    const handleDifficultySelect = (difficulty: AIDifficulty) => {
        setSelectedDifficulty(difficulty);
        gameActions.startSinglePlayer(difficulty);
    };

    const handleBackToMenu = () => {
        gameState.setGameMode('menu');
        setSelectedDifficulty(null);
    };

    // Loading states - connecting to server
    if (!socket) {
        return <LoadingScreen title="Connecting to Server..." />;
    }

    // Loading states - loading game
    if (isLoading) {
        return <LoadingScreen title="Loading game..." />;
    }

    // Difficulty selection screen
    if (gameMode === 'single_player' && !selectedDifficulty && !started) {
        return (
            <DifficultySelector
                onDifficultySelect={handleDifficultySelect}
                onBack={handleBackToMenu}
            />
        );
    }

    // Menu screen
    if (hasCheckedResume && gameMode === 'menu') {
        return (
            <ModernGameMenu
                roomId={roomId}
                onRoomIdChange={setRoomId}
                onStartSinglePlayer={() => gameState.setGameMode('single_player')}
                onStartMultiplayer={gameActions.startMultiplayer}
                onCreateRoom={gameActions.createRoom}
                onJoinRoom={gameActions.joinRoom}
                showTemporaryError={showTemporaryError}
            />
        );
    }

    // Waiting for opponent screen
    if (waitingForOpponent && !started) {
        return (
            <WaitingScreen
                createdRoomId={createdRoomId}
                onCopyRoomCode={handleCopyRoomCode}
                onCancel={handleCancelWaiting}
            />
        );
    }

    // Main game screen
    return (
        <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-2">
            <GameNotifications
                errorMessage={errorMessage}
                incomingCall={incomingCall}
                onAcceptCall={handleAcceptIncomingCall}
                onRejectCall={handleRejectIncomingCall}
                onDismissError={handleDismissError}
            />
            
            <GameBoard
                chess={chessRef.current}
                socket={socket}
                playerColor={playerColor}
                moveCount={moveCount}
                gameMode={gameMode}
                started={started}
                waitingForOpponent={waitingForOpponent}
                opponentConnected={opponentConnected}
                opponentDisconnected={opponentDisconnected}
                disconnectTimer={disconnectTimer}
                isGameDisabled={isGameDisabled}
                boardFen={boardFen}
                incomingCall={incomingCall}
                opponentInfo={opponentInfo}
                selectedDifficulty={selectedDifficulty}
                videoCallState={videoCallState}
                localVideoRef={localVideoRef}
                remoteVideoRef={remoteVideoRef}
                onStartVideoCall={handleStartVideoCall}
                onToggleMute={toggleMute}
                onToggleVideo={toggleVideo}
                onEndCall={endCall}
                setErrorMessage={setErrorMessage}
                onLeaveGame={gameActions.endGame}
            />
        </div>
    );
};