import type { GameState, ServerWebSocket, VideoCall } from '../types/game';
import { validateAuthentication, disconnectTimeouts } from './state-manager';
import { prisma } from './prisma';
import { safeSend } from './utils';
import { MATCHMAKING_CANCELLED, VIDEO_CALL_ENDED } from '../types/game';

// ... move all game ending and cleanup logic here ...
// Export all these functions 

// Helper function to cleanup video calls for a socket
function cleanupVideoCallsForSocket(state: GameState & { videoCalls: Map<string, VideoCall> }, socket: ServerWebSocket): void {
    if (!('videoCalls' in state)) return;
    
    const stateWithVideo = state as GameState & { videoCalls: Map<string, VideoCall> };
    const callsToDelete: string[] = [];
    
    stateWithVideo.videoCalls.forEach((call, callId) => {
        if (call.initiator === socket || call.receiver === socket) {
            // Notify the other participant that the call ended
            const otherParticipant = call.initiator === socket ? call.receiver : call.initiator;
            if (otherParticipant && otherParticipant.readyState === 1) {
                safeSend(otherParticipant, {
                    type: VIDEO_CALL_ENDED,
                    payload: { callId },
                    from: 'system',
                    to: 'you'
                });
            }
            callsToDelete.push(callId);
        }
    });
    
    // Remove the calls
    callsToDelete.forEach(callId => {
        stateWithVideo.videoCalls.delete(callId);
    });
}

export async function handleEndGame(state: GameState, socket: ServerWebSocket): Promise<void> {
    if (!validateAuthentication(socket)) return;
    
    try {
        // Clean up any active video calls for this socket
        cleanupVideoCallsForSocket(state as GameState & { videoCalls: Map<string, VideoCall> }, socket);
        // Check both arrays at once
        const singlePlayerIdx = state.singlePlayerGames.findIndex(g => g.player === socket);
        const multiplayerIdx = state.games.findIndex(g => g.player1 === socket || g.player2 === socket);
        
        if (singlePlayerIdx !== -1) {
            // Handle single player game
            const game = state.singlePlayerGames[singlePlayerIdx];
            if (game.dbId) {
                try {
                    await prisma.move.deleteMany({ where: { gameId: game.dbId } });
                    await prisma.game.delete({ where: { id: game.dbId } });
                } catch (dbError) {
                    console.error(`Failed to delete single player game:`, dbError);
                }
            }
            state.singlePlayerGames.splice(singlePlayerIdx, 1);
            return;
        }
        
        if (multiplayerIdx !== -1) {
            // Handle multiplayer game
            const game = state.games[multiplayerIdx];
            if (game.dbId) {
                try {
                    await prisma.move.deleteMany({ where: { gameId: game.dbId } });
                    await prisma.game.delete({ where: { id: game.dbId } });
                } catch (dbError) {
                    console.error(`Failed to delete multiplayer game:`, dbError);
                }
            }
            state.games.splice(multiplayerIdx, 1);
            
            const opponent = game.player1 === socket ? game.player2 : game.player1;
            if (opponent?.readyState === 1) {
                opponent.send(JSON.stringify({ type: 'opponent_left' }));
            }
            return;
        }
        
        console.log(`No active game found for user`);
        
    } catch (error) {
        console.error(`Error in handleEndGame:`, error);
    }
}

export function cleanupAllTimeouts(): void {
    for (const [gameId, timeout] of Array.from(disconnectTimeouts.entries())) {
        clearTimeout(timeout);
    }
    disconnectTimeouts.clear();
}

export function handleCancelMatchmaking(state: GameState, socket: ServerWebSocket): void {
    if (!validateAuthentication(socket)) return;
    if (state.pendingUser === socket) {
        state.pendingUser = null;
        safeSend(socket, { type: MATCHMAKING_CANCELLED });
    }
} 