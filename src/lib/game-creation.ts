import type { GameState, WebSocketWithUserId, ServerWebSocket, GameRoom, MultiplayerGame, SinglePlayerGame } from '../types/game';
import { generateRoomId, checkRateLimit, validateAuthentication, ROOM_CREATION_RATE_LIMIT_MS, moveRateLimit, roomCreationLimit } from './state-manager';
import { Chess } from 'chess.js';
import { prisma } from './prisma';
import { safeSend } from './utils';
import { INIT_GAME, WAITING_FOR_OPPONENT, ROOM_CREATED, ROOM_JOINED, ROOM_NOT_FOUND, ERROR } from '../types/game';
import { getUserInfo, formatDisplayName } from './clerk-server';

export async function handleInitGame(state: GameState, socket: WebSocketWithUserId): Promise<void> {
    if (!validateAuthentication(socket)) return;
    if (!state.pendingUser) {
        state.pendingUser = socket;
        safeSend(socket, { type: WAITING_FOR_OPPONENT });
    } else {
        await createMultiplayerGame(state, state.pendingUser as WebSocketWithUserId, socket);
        state.pendingUser = null;
    }
}

async function createMultiplayerGame(state: GameState, player1: WebSocketWithUserId, player2: WebSocketWithUserId): Promise<void> {
    const dbGame = await prisma.game.create({
        data: {
            playerWhiteId: player1.userId,
            playerBlackId: player2.userId,
            status: 'ACTIVE',
        }
    });

    // Fetch user info for both players
    const [player1Info, player2Info] = await Promise.all([
        player1.clerkId ? getUserInfo(player1.clerkId) : null,
        player2.clerkId ? getUserInfo(player2.clerkId) : null
    ]);

    const game: MultiplayerGame = {
        player1,
        player2,
        board: new Chess(),
        startTime: new Date(),
        moveCount: 0,
        dbId: dbGame.id
    };
    state.games.push(game);

    // Send game start messages with opponent info
    safeSend(player1, { 
        type: INIT_GAME, 
        payload: { 
            color: 'white',
            opponentInfo: player2Info ? {
                name: formatDisplayName(player2Info),
                email: player2Info.emailAddress,
                clerkId: player2Info.id
            } : null
        } 
    });
    
    safeSend(player2, { 
        type: INIT_GAME, 
        payload: { 
            color: 'black',
            opponentInfo: player1Info ? {
                name: formatDisplayName(player1Info),
                email: player1Info.emailAddress,
                clerkId: player1Info.id
            } : null
        } 
    });
}

export async function handleSinglePlayer(state: GameState, socket: ServerWebSocket, difficulty: string = 'medium'): Promise<void> {
    if (!validateAuthentication(socket)) return;
    
    // Validate difficulty level
    const validDifficulties = ['easy', 'medium', 'hard'];
    const selectedDifficulty = validDifficulties.includes(difficulty) ? difficulty : 'medium';
    
    // Create database record for single player game
    const dbGame = await prisma.game.create({
        data: {
            gameType: 'SINGLE_PLAYER',
            status: 'ACTIVE',
            playerWhiteId: (socket as any).userId, // Player is always white in single player
            difficulty: selectedDifficulty
        }
    });
    
    const game: SinglePlayerGame = {
        player: socket,
        board: new Chess(),
        startTime: new Date(),
        difficulty: selectedDifficulty as 'easy' | 'medium' | 'hard',
        dbId: dbGame.id
    };
    state.singlePlayerGames.push(game);
    socket.send(JSON.stringify({
        type: INIT_GAME,
        payload: { color: 'white' }
    }));
}

export function handleCreateRoom(state: GameState, socket: ServerWebSocket): void {
    if (!validateAuthentication(socket)) return;
    const socketKey = socket.toString();
    if (!checkRateLimit(roomCreationLimit, socketKey, ROOM_CREATION_RATE_LIMIT_MS)) {
        safeSend(socket, {
            type: ERROR,
            payload: { message: "Please wait before creating another room" }
        });
        return;
    }
    const roomId = generateRoomId();
    const room: GameRoom = {
        id: roomId,
        player1: socket
    };
    state.rooms.set(roomId, room);
    safeSend(socket, { type: ROOM_CREATED, payload: { roomId } });
    safeSend(socket, { type: WAITING_FOR_OPPONENT });
}

export async function handleJoinRoom(state: GameState, socket: WebSocketWithUserId, roomId: string): Promise<void> {
    if (!validateAuthentication(socket)) return;
    const room = state.rooms.get(roomId);
    if (!room) {
        (socket as any).send(JSON.stringify({
            type: ROOM_NOT_FOUND,
            payload: { message: "Room not found" }
        }));
        return;
    }
    if (room.player2) {
        (socket as any).send(JSON.stringify({
            type: ERROR,
            payload: { message: "Room is full" }
        }));
        return;
    }
    await createRoomGame(state, room, socket);
}

async function createRoomGame(state: GameState, room: GameRoom, player2: WebSocketWithUserId): Promise<void> {
    room.player2 = player2;
    const player1 = room.player1 as WebSocketWithUserId;
    const dbGame = await prisma.game.create({
        data: {
            playerWhiteId: player1.userId,
            playerBlackId: player2.userId,
            status: 'ACTIVE',
        }
    });

    // Fetch user info for both players
    const [player1Info, player2Info] = await Promise.all([
        player1.clerkId ? getUserInfo(player1.clerkId) : null,
        player2.clerkId ? getUserInfo(player2.clerkId) : null
    ]);

    const game: MultiplayerGame = {
        player1: room.player1,
        player2: room.player2,
        board: new Chess(),
        startTime: new Date(),
        moveCount: 0,
        dbId: dbGame.id
    };
    room.game = game;
    state.games.push(game);

    // Send room joined messages with opponent info
    safeSend(room.player1, { 
        type: ROOM_JOINED, 
        payload: { 
            color: 'white',
            opponentInfo: player2Info ? {
                name: formatDisplayName(player2Info),
                email: player2Info.emailAddress,
                clerkId: player2Info.id
            } : null
        } 
    });
    
    safeSend(room.player2, { 
        type: ROOM_JOINED, 
        payload: { 
            color: 'black',
            opponentInfo: player1Info ? {
                name: formatDisplayName(player1Info),
                email: player1Info.emailAddress,
                clerkId: player1Info.id
            } : null
        } 
    });
}

// ... move all game creation, matchmaking, and room logic here ...
// Export all these functions 