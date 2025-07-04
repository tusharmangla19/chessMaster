import { Chess } from 'chess.js';
import { ChessBoard } from "../ChessBoard";
import { VideoCallButton } from "../VideoCallButton";
import { GameStatus } from "./GameStatus";
import { GameInfo } from "./GameInfo";
import { GameOverStatus } from "./GameOverStatus";
import { VideoCallDisplay } from "./VideoCallDisplay";
import { GameMode, PlayerColor, OpponentInfo as OpponentInfoType, AIDifficulty } from "./types";
import { Button } from "../ui/button";

interface GameBoardProps {
    chess: Chess;
    socket: WebSocket | null;
    playerColor: PlayerColor;
    moveCount: number;
    gameMode: GameMode;
    started: boolean;
    waitingForOpponent: boolean;
    opponentConnected: boolean;
    opponentDisconnected: boolean;
    disconnectTimer: number;
    isGameDisabled: boolean;
    boardFen: string;
    incomingCall: { callId: string; from: string } | null;
    opponentInfo: OpponentInfoType | null;
    selectedDifficulty: AIDifficulty | null;
    videoCallState: {
        isInCall: boolean;
        isCallActive: boolean;
        isMuted: boolean;
        isVideoEnabled: boolean;
        connectionStatus: 'idle' | 'connecting' | 'connected' | 'failed' | 'ended';
        errorMessage: string | null;
        remoteStream: MediaStream | null;
        localStream: MediaStream | null;
    };
    localVideoRef: React.RefObject<HTMLVideoElement>;
    remoteVideoRef: React.RefObject<HTMLVideoElement>;
    onStartVideoCall: () => void;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    onEndCall: () => void;
    onLeaveGame: () => void;
    setErrorMessage: (message: string | null) => void;
}

export const GameBoard = ({
    chess,
    socket,
    playerColor,
    moveCount,
    gameMode,
    started,
    waitingForOpponent,
    opponentConnected,
    opponentDisconnected,
    disconnectTimer,
    isGameDisabled,
    boardFen,
    incomingCall,
    opponentInfo,
    selectedDifficulty,
    videoCallState,
    localVideoRef,
    remoteVideoRef,
    onStartVideoCall,
    onToggleMute,
    onToggleVideo,
    onEndCall,
    onLeaveGame,
    setErrorMessage
}: GameBoardProps) => {
    const currentTurn = chess.turn() === 'w' ? 'white' : 'black';
    const isPlayerTurn = playerColor === currentTurn;

    return (
        <div className="h-full max-w-7xl mx-auto flex flex-col">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
                {/* Game board area */}
                <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                    {isGameDisabled && gameMode === 'multiplayer' && (
                        <div className="p-4 text-center text-lg font-semibold text-yellow-700 bg-yellow-100 rounded-lg mb-4">
                            Waiting for opponent to connect...
                        </div>
                    )}

                    {/* Chess board container - fixed size, always centered */}
                    <div className="bg-white/10 rounded-xl border border-white/20 p-4 max-w-2xl w-full mx-auto">
                        {socket && (
                            <ChessBoard 
                                chess={chess} 
                                socket={socket} 
                                playerColor={playerColor}
                                moveCount={moveCount}
                                boardFen={boardFen}
                                isVideoCallActive={false}
                                disableMoves={isGameDisabled}
                                setErrorMessage={setErrorMessage}
                            />
                        )}
                    </div>
                </div>

                {/* Sidebar area - fixed width with responsive grid for video calls */}
                <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 ${
                    videoCallState.isInCall 
                        ? 'grid grid-cols-2 gap-2 md:block md:space-y-2' 
                        : 'space-y-2'
                }`}>
                    {/* Game Stats Section */}
                    <div className={`${videoCallState.isInCall ? 'space-y-1 md:space-y-2' : 'space-y-2'}`}>
                        <GameStatus
                            isPlayerTurn={isPlayerTurn}
                            gameMode={gameMode}
                            playerColor={playerColor}
                            moveCount={moveCount}
                            opponentDisconnected={opponentDisconnected}
                            disconnectTimer={disconnectTimer}
                        />

                        <GameInfo
                            playerColor={playerColor}
                            moveCount={moveCount}
                            gameMode={gameMode}
                            opponentName={gameMode === 'single_player' ? `AI (${selectedDifficulty || 'Medium'})` : (opponentInfo?.name ?? 'Anonymous Player')}
                        />

                        <Button
                            variant="danger"
                            className="w-full mt-1"
                            onClick={onLeaveGame}
                        >
                            Leave Game
                        </Button>

                        {/* Video call button - placed below Leave Game button */}
                        {started && gameMode !== 'single_player' && !videoCallState.isInCall && !incomingCall && (
                            <VideoCallButton
                                onClick={onStartVideoCall}
                                disabled={!started}
                                isInCall={false}
                                className="w-full"
                            />
                        )}

                        <GameOverStatus
                            chess={chess}
                            currentTurn={currentTurn}
                        />
                    </div>

                    {/* Video Call Section */}
                    <div className={`${videoCallState.isInCall ? 'min-w-0 overflow-hidden' : ''}`}>
                        <VideoCallDisplay
                            isInCall={videoCallState.isInCall}
                            isCallActive={videoCallState.isCallActive}
                            isMuted={videoCallState.isMuted}
                            isVideoEnabled={videoCallState.isVideoEnabled}
                            remoteStream={videoCallState.remoteStream}
                            localStream={videoCallState.localStream}
                            localVideoRef={localVideoRef}
                            remoteVideoRef={remoteVideoRef}
                            onToggleMute={onToggleMute}
                            onToggleVideo={onToggleVideo}
                            onEndCall={onEndCall}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}; 