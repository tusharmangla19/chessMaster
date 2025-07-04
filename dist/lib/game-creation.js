"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInitGame = handleInitGame;
exports.handleSinglePlayer = handleSinglePlayer;
exports.handleCreateRoom = handleCreateRoom;
exports.handleJoinRoom = handleJoinRoom;
const state_manager_1 = require("./state-manager");
const chess_js_1 = require("chess.js");
const prisma_1 = require("./prisma");
const utils_1 = require("./utils");
const game_1 = require("../types/game");
const clerk_server_1 = require("./clerk-server");
async function handleInitGame(state, socket) {
    if (!(0, state_manager_1.validateAuthentication)(socket))
        return;
    if (!state.pendingUser) {
        state.pendingUser = socket;
        (0, utils_1.safeSend)(socket, { type: game_1.WAITING_FOR_OPPONENT });
    }
    else {
        await createMultiplayerGame(state, state.pendingUser, socket);
        state.pendingUser = null;
    }
}
async function createMultiplayerGame(state, player1, player2) {
    const dbGame = await prisma_1.prisma.game.create({
        data: {
            playerWhiteId: player1.userId,
            playerBlackId: player2.userId,
            status: 'ACTIVE',
        }
    });
    // Fetch user info for both players
    const [player1Info, player2Info] = await Promise.all([
        player1.clerkId ? (0, clerk_server_1.getUserInfo)(player1.clerkId) : null,
        player2.clerkId ? (0, clerk_server_1.getUserInfo)(player2.clerkId) : null
    ]);
    const game = {
        player1,
        player2,
        board: new chess_js_1.Chess(),
        startTime: new Date(),
        moveCount: 0,
        dbId: dbGame.id
    };
    state.games.push(game);
    // Send game start messages with opponent info
    (0, utils_1.safeSend)(player1, {
        type: game_1.INIT_GAME,
        payload: {
            color: 'white',
            opponentInfo: player2Info ? {
                name: (0, clerk_server_1.formatDisplayName)(player2Info),
                email: player2Info.emailAddress,
                clerkId: player2Info.id
            } : null
        }
    });
    (0, utils_1.safeSend)(player2, {
        type: game_1.INIT_GAME,
        payload: {
            color: 'black',
            opponentInfo: player1Info ? {
                name: (0, clerk_server_1.formatDisplayName)(player1Info),
                email: player1Info.emailAddress,
                clerkId: player1Info.id
            } : null
        }
    });
}
async function handleSinglePlayer(state, socket, difficulty = 'medium') {
    if (!(0, state_manager_1.validateAuthentication)(socket))
        return;
    // Validate difficulty level
    const validDifficulties = ['easy', 'medium', 'hard'];
    const selectedDifficulty = validDifficulties.includes(difficulty) ? difficulty : 'medium';
    // Create database record for single player game
    const dbGame = await prisma_1.prisma.game.create({
        data: {
            gameType: 'SINGLE_PLAYER',
            status: 'ACTIVE',
            playerWhiteId: socket.userId, // Player is always white in single player
            difficulty: selectedDifficulty
        }
    });
    const game = {
        player: socket,
        board: new chess_js_1.Chess(),
        startTime: new Date(),
        difficulty: selectedDifficulty,
        dbId: dbGame.id
    };
    state.singlePlayerGames.push(game);
    socket.send(JSON.stringify({
        type: game_1.INIT_GAME,
        payload: { color: 'white' }
    }));
}
function handleCreateRoom(state, socket) {
    if (!(0, state_manager_1.validateAuthentication)(socket))
        return;
    const socketKey = socket.toString();
    if (!(0, state_manager_1.checkRateLimit)(state_manager_1.roomCreationLimit, socketKey, state_manager_1.ROOM_CREATION_RATE_LIMIT_MS)) {
        (0, utils_1.safeSend)(socket, {
            type: game_1.ERROR,
            payload: { message: "Please wait before creating another room" }
        });
        return;
    }
    const roomId = (0, state_manager_1.generateRoomId)();
    const room = {
        id: roomId,
        player1: socket
    };
    state.rooms.set(roomId, room);
    (0, utils_1.safeSend)(socket, { type: game_1.ROOM_CREATED, payload: { roomId } });
    (0, utils_1.safeSend)(socket, { type: game_1.WAITING_FOR_OPPONENT });
}
async function handleJoinRoom(state, socket, roomId) {
    if (!(0, state_manager_1.validateAuthentication)(socket))
        return;
    const room = state.rooms.get(roomId);
    if (!room) {
        socket.send(JSON.stringify({
            type: game_1.ROOM_NOT_FOUND,
            payload: { message: "Room not found" }
        }));
        return;
    }
    if (room.player2) {
        socket.send(JSON.stringify({
            type: game_1.ERROR,
            payload: { message: "Room is full" }
        }));
        return;
    }
    await createRoomGame(state, room, socket);
}
async function createRoomGame(state, room, player2) {
    room.player2 = player2;
    const player1 = room.player1;
    const dbGame = await prisma_1.prisma.game.create({
        data: {
            playerWhiteId: player1.userId,
            playerBlackId: player2.userId,
            status: 'ACTIVE',
        }
    });
    // Fetch user info for both players
    const [player1Info, player2Info] = await Promise.all([
        player1.clerkId ? (0, clerk_server_1.getUserInfo)(player1.clerkId) : null,
        player2.clerkId ? (0, clerk_server_1.getUserInfo)(player2.clerkId) : null
    ]);
    const game = {
        player1: room.player1,
        player2: room.player2,
        board: new chess_js_1.Chess(),
        startTime: new Date(),
        moveCount: 0,
        dbId: dbGame.id
    };
    room.game = game;
    state.games.push(game);
    // Send room joined messages with opponent info
    (0, utils_1.safeSend)(room.player1, {
        type: game_1.ROOM_JOINED,
        payload: {
            color: 'white',
            opponentInfo: player2Info ? {
                name: (0, clerk_server_1.formatDisplayName)(player2Info),
                email: player2Info.emailAddress,
                clerkId: player2Info.id
            } : null
        }
    });
    (0, utils_1.safeSend)(room.player2, {
        type: game_1.ROOM_JOINED,
        payload: {
            color: 'black',
            opponentInfo: player1Info ? {
                name: (0, clerk_server_1.formatDisplayName)(player1Info),
                email: player1Info.emailAddress,
                clerkId: player1Info.id
            } : null
        }
    });
}
// ... move all game creation, matchmaking, and room logic here ...
// Export all these functions 
//# sourceMappingURL=game-creation.js.map