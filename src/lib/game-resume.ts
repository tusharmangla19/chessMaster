import type { GameState, WebSocketWithUserId } from '../types/game';
import { Chess } from 'chess.js';
import { prisma } from './prisma';
import { safeSend } from './utils';
import { ERROR } from '../types/game';
import { disconnectTimeouts } from './state-manager';
import { getUserInfo, formatDisplayName } from './clerk-server';

// ... move all game resumption logic here ...
// Export all these functions 

export async function resumeActiveGameForUser(state: GameState, ws: WebSocketWithUserId): Promise<void> {
    if (!ws.userId) {
        console.log('❌ No userId for game resume check');
        return;
    }
    try {
        console.log('🔍 Checking for active games for userId:', ws.userId);
        const dbGame = await prisma.game.findFirst({
            where: {
                status: 'ACTIVE',
                OR: [
                    { playerWhiteId: ws.userId },
                    { playerBlackId: ws.userId }
                ]
            }
        }) as any;
        if (!dbGame) {
            console.log('📭 No active game found, sending no_game_to_resume');
            safeSend(ws, { type: 'no_game_to_resume' });
            return;
        }
        console.log('🎮 Found active game:', dbGame.id);
        await resumeGame(state, ws, dbGame);
    } catch (error) {
        console.error('❌ Error in resumeActiveGameForUser:', error);
        safeSend(ws, { type: 'error', payload: { message: 'Failed to check for active games' } });
    }
}

async function resumeGame(state: GameState, ws: WebSocketWithUserId, dbGame: any): Promise<void> {
    try {
        const dbMoves = await prisma.move.findMany({
            where: { gameId: dbGame.id },
            orderBy: { moveNum: 'asc' }
        });
        const chess = new Chess();
        const moveHistory = [];
        for (const dbMove of dbMoves) {
            try {
                const moveResult = chess.move({ from: dbMove.from, to: dbMove.to });
                if (!moveResult) {
                    console.error(`Invalid move in database: ${dbMove.from}-${dbMove.to}`);
                    throw new Error(`Invalid move found in database`);
                }
                moveHistory.push({
                    from: dbMove.from,
                    to: dbMove.to,
                    san: dbMove.san,
                    fen: dbMove.fen
                });
            } catch (error) {
                console.error('Error processing move from database:', error);
                throw new Error('Failed to reconstruct game from database');
            }
        }
        const isCurrentPlayerWhite = dbGame.playerWhiteId === ws.userId;
        const opponentUserId = isCurrentPlayerWhite ? dbGame.playerBlackId : dbGame.playerWhiteId;
        const opponentSocket = state.users.find(u => 
            (u as WebSocketWithUserId).userId === opponentUserId
        ) as WebSocketWithUserId | undefined;
        
        // Check if this is a single player game
        const isSinglePlayer = dbGame.gameType === 'SINGLE_PLAYER';
        
        // Fetch opponent info for multiplayer games
        let opponentInfo = null;
        if (!isSinglePlayer && opponentSocket?.clerkId) {
            const opponentClerkInfo = await getUserInfo(opponentSocket.clerkId);
            if (opponentClerkInfo) {
                opponentInfo = {
                    name: formatDisplayName(opponentClerkInfo),
                    email: opponentClerkInfo.emailAddress,
                    clerkId: opponentClerkInfo.id
                };
            }
        }
        
        if (isSinglePlayer) {
            // Handle single player game resumption
            let inMemoryGame = state.singlePlayerGames.find(g => g.dbId === dbGame.id);
            if (!inMemoryGame) {
                inMemoryGame = {
                    player: ws,
                    board: chess,
                    startTime: dbGame.createdAt,
                    difficulty: dbGame.difficulty as 'easy' | 'medium' | 'hard',
                    dbId: dbGame.id
                };
                state.singlePlayerGames.push(inMemoryGame);
            } else {
                inMemoryGame.player = ws;
                inMemoryGame.board = chess;
            }
        } else {
            // Handle multiplayer game resumption
            let inMemoryGame = state.games.find(g => g.dbId === dbGame.id);
            if (!inMemoryGame) {
                inMemoryGame = {
                    player1: isCurrentPlayerWhite ? ws : (opponentSocket ?? null),
                    player2: !isCurrentPlayerWhite ? ws : (opponentSocket ?? null),
                    board: chess,
                    startTime: dbGame.createdAt,
                    moveCount: dbMoves.length,
                    dbId: dbGame.id,
                    waitingForOpponent: !opponentSocket
                };
                state.games.push(inMemoryGame);
            } else {
                if (isCurrentPlayerWhite) {
                    inMemoryGame.player1 = ws;
                } else {
                    inMemoryGame.player2 = ws;
                }
                inMemoryGame.waitingForOpponent = !opponentSocket;
            }
        }
        // Handle disconnect timeouts and opponent reconnection
        if (disconnectTimeouts.has(dbGame.id)) {
            clearTimeout(disconnectTimeouts.get(dbGame.id));
            disconnectTimeouts.delete(dbGame.id);
        }
        
        if (!isSinglePlayer && opponentSocket?.readyState === 1) {
            safeSend(opponentSocket, { type: 'opponent_reconnected' });
        }
        const playerColor = isCurrentPlayerWhite ? 'white' : 'black';
        safeSend(ws, {
            type: 'resume_game',
            payload: {
                color: playerColor,
                fen: chess.fen(),
                moveHistory,
                opponentConnected: !!opponentSocket,
                waitingForOpponent: isSinglePlayer ? false : !opponentSocket,
                opponentInfo
            }
        });
    } catch (error) {
        console.error('Error resuming game:', error);
        safeSend(ws, {
            type: ERROR,
            payload: { message: 'Failed to resume game. Please try again.' }
        });
    }
} 