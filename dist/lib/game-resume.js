"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeActiveGameForUser = resumeActiveGameForUser;
const chess_js_1 = require("chess.js");
const prisma_1 = require("./prisma");
const utils_1 = require("./utils");
const game_1 = require("../types/game");
const state_manager_1 = require("./state-manager");
const clerk_server_1 = require("./clerk-server");
// ... move all game resumption logic here ...
// Export all these functions 
async function resumeActiveGameForUser(state, ws) {
    if (!ws.userId) {
        console.log('❌ No userId for game resume check');
        return;
    }
    try {
        console.log('🔍 Checking for active games for userId:', ws.userId);
        const dbGame = await prisma_1.prisma.game.findFirst({
            where: {
                status: 'ACTIVE',
                OR: [
                    { playerWhiteId: ws.userId },
                    { playerBlackId: ws.userId }
                ]
            }
        });
        if (!dbGame) {
            console.log('📭 No active game found, sending no_game_to_resume');
            (0, utils_1.safeSend)(ws, { type: 'no_game_to_resume' });
            return;
        }
        console.log('🎮 Found active game:', dbGame.id);
        await resumeGame(state, ws, dbGame);
    }
    catch (error) {
        console.error('❌ Error in resumeActiveGameForUser:', error);
        (0, utils_1.safeSend)(ws, { type: 'error', payload: { message: 'Failed to check for active games' } });
    }
}
async function resumeGame(state, ws, dbGame) {
    try {
        const dbMoves = await prisma_1.prisma.move.findMany({
            where: { gameId: dbGame.id },
            orderBy: { moveNum: 'asc' }
        });
        const chess = new chess_js_1.Chess();
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
            }
            catch (error) {
                console.error('Error processing move from database:', error);
                throw new Error('Failed to reconstruct game from database');
            }
        }
        const isCurrentPlayerWhite = dbGame.playerWhiteId === ws.userId;
        const opponentUserId = isCurrentPlayerWhite ? dbGame.playerBlackId : dbGame.playerWhiteId;
        const opponentSocket = state.users.find(u => u.userId === opponentUserId);
        // Check if this is a single player game
        const isSinglePlayer = dbGame.gameType === 'SINGLE_PLAYER';
        // Fetch opponent info for multiplayer games
        let opponentInfo = null;
        if (!isSinglePlayer && opponentSocket?.clerkId) {
            const opponentClerkInfo = await (0, clerk_server_1.getUserInfo)(opponentSocket.clerkId);
            if (opponentClerkInfo) {
                opponentInfo = {
                    name: (0, clerk_server_1.formatDisplayName)(opponentClerkInfo),
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
                    difficulty: dbGame.difficulty,
                    dbId: dbGame.id
                };
                state.singlePlayerGames.push(inMemoryGame);
            }
            else {
                inMemoryGame.player = ws;
                inMemoryGame.board = chess;
            }
        }
        else {
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
            }
            else {
                if (isCurrentPlayerWhite) {
                    inMemoryGame.player1 = ws;
                }
                else {
                    inMemoryGame.player2 = ws;
                }
                inMemoryGame.waitingForOpponent = !opponentSocket;
            }
        }
        // Handle disconnect timeouts and opponent reconnection
        if (state_manager_1.disconnectTimeouts.has(dbGame.id)) {
            clearTimeout(state_manager_1.disconnectTimeouts.get(dbGame.id));
            state_manager_1.disconnectTimeouts.delete(dbGame.id);
        }
        if (!isSinglePlayer && opponentSocket?.readyState === 1) {
            (0, utils_1.safeSend)(opponentSocket, { type: 'opponent_reconnected' });
        }
        const playerColor = isCurrentPlayerWhite ? 'white' : 'black';
        (0, utils_1.safeSend)(ws, {
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
    }
    catch (error) {
        console.error('Error resuming game:', error);
        (0, utils_1.safeSend)(ws, {
            type: game_1.ERROR,
            payload: { message: 'Failed to resume game. Please try again.' }
        });
    }
}
//# sourceMappingURL=game-resume.js.map