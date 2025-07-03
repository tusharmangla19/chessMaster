import type { GameState, ServerWebSocket } from '../types/game';
import { validateAuthentication, disconnectTimeouts } from './state-manager';
import { prisma } from './prisma';
import { safeSend } from './utils';
import { MATCHMAKING_CANCELLED } from '../types/game';

// ... move all game ending and cleanup logic here ...
// Export all these functions 

export async function handleEndGame(state: GameState, socket: ServerWebSocket): Promise<void> {
    if (!validateAuthentication(socket)) return;
    
    try {
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