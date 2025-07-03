"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEndGame = handleEndGame;
exports.cleanupAllTimeouts = cleanupAllTimeouts;
exports.handleCancelMatchmaking = handleCancelMatchmaking;
const state_manager_1 = require("./state-manager");
const prisma_1 = require("./prisma");
const utils_1 = require("./utils");
const game_1 = require("../types/game");
// ... move all game ending and cleanup logic here ...
// Export all these functions 
async function handleEndGame(state, socket) {
    if (!(0, state_manager_1.validateAuthentication)(socket))
        return;
    try {
        // Check both arrays at once
        const singlePlayerIdx = state.singlePlayerGames.findIndex(g => g.player === socket);
        const multiplayerIdx = state.games.findIndex(g => g.player1 === socket || g.player2 === socket);
        if (singlePlayerIdx !== -1) {
            // Handle single player game
            const game = state.singlePlayerGames[singlePlayerIdx];
            if (game.dbId) {
                try {
                    await prisma_1.prisma.move.deleteMany({ where: { gameId: game.dbId } });
                    await prisma_1.prisma.game.delete({ where: { id: game.dbId } });
                }
                catch (dbError) {
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
                    await prisma_1.prisma.move.deleteMany({ where: { gameId: game.dbId } });
                    await prisma_1.prisma.game.delete({ where: { id: game.dbId } });
                }
                catch (dbError) {
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
    }
    catch (error) {
        console.error(`Error in handleEndGame:`, error);
    }
}
function cleanupAllTimeouts() {
    for (const [gameId, timeout] of Array.from(state_manager_1.disconnectTimeouts.entries())) {
        clearTimeout(timeout);
    }
    state_manager_1.disconnectTimeouts.clear();
}
function handleCancelMatchmaking(state, socket) {
    if (!(0, state_manager_1.validateAuthentication)(socket))
        return;
    if (state.pendingUser === socket) {
        state.pendingUser = null;
        (0, utils_1.safeSend)(socket, { type: game_1.MATCHMAKING_CANCELLED });
    }
}
//# sourceMappingURL=game-end.js.map