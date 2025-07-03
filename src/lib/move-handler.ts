import type { GameState, ServerWebSocket, Move, MultiplayerGame, SinglePlayerGame, AIDifficulty } from '../types/game';
import { moveRateLimit, checkRateLimit, validateAuthentication, MOVE_RATE_LIMIT_MS } from './state-manager';
import { Chess } from 'chess.js';
import { prisma } from './prisma';
import { safeSend } from './utils';
import { MOVE, ERROR, GAME_OVER } from '../types/game';
import { Prisma } from '@prisma/client';

export async function handleMove(state: GameState, socket: ServerWebSocket, move: Move): Promise<void> {
    try {
        if (!validateAuthentication(socket)) {
            return;
        }
        
        const playerId = socket.toString();
        
        if (!checkRateLimit(moveRateLimit, playerId, MOVE_RATE_LIMIT_MS)) {
            safeSend(socket, {
                type: ERROR,
                payload: { message: "Move too fast. Please wait a moment." }
            });
            return;
        }
        
        // Check for multiplayer game first
        const multiplayerGame = state.games.find(game => 
            game.player1 === socket || game.player2 === socket
        );
        
        if (multiplayerGame) {
            await handleMultiplayerMove(state, multiplayerGame, socket, move);
            return;
        }
        
        // Check for single player game
        const singlePlayerGame = state.singlePlayerGames.find(game => game.player === socket);
        
        if (singlePlayerGame) {
            await handleSinglePlayerMove(state, singlePlayerGame, socket, move);
            return;
        }
        
        safeSend(socket, {
            type: ERROR,
            payload: { message: "No active game found" }
        });
        
    } catch (error: any) {
        console.error('[MoveHandler] Error in handleMove:', error);
        safeSend(socket, {
            type: ERROR,
            payload: { message: "Internal server error" }
        });
    }
}

async function handleMultiplayerMove(state: GameState, game: MultiplayerGame, socket: ServerWebSocket, move: Move): Promise<void> {
    const isPlayer1 = game.player1 === socket;
    const isPlayer2 = game.player2 === socket;
    if (!isPlayer1 && !isPlayer2) {
        safeSend(socket, { type: ERROR, payload: { message: "You are not a player in this game" } });
        return;
    }
    if (!game.player1 || !game.player2) {
        safeSend(socket, { type: ERROR, payload: { message: "Waiting for opponent to reconnect." } });
        return;
    }
    try {
        const currentTurn = game.board.turn() === 'w' ? 'white' : 'black';
        const playerColor = isPlayer1 ? 'white' : 'black';
        if (currentTurn !== playerColor) {
            safeSend(socket, { type: ERROR, payload: { message: "Not your turn" } });
            return;
        }
        if (!validatePawnPromotion(game.board, move)) {
            safeSend(socket, {
                type: ERROR,
                payload: { message: "Pawn promotion required! Please select Queen, Rook, Bishop, or Knight." }
            });
            return;
        }
        const testBoard = new Chess(game.board.fen());
        const moveResult = testBoard.move(move);
        if (!moveResult) {
            safeSend(socket, { type: ERROR, payload: { message: "Illegal move" } });
            return;
        }
        await executeMove(game, move, moveResult);
        const opponent = isPlayer1 ? game.player2 : game.player1;
        const moveMessage = { type: MOVE, payload: { move } };
        safeSend(opponent, moveMessage);
        safeSend(socket, moveMessage);
        await checkAndHandleGameOver(state, game);
    } catch (error) {
        console.error('Move processing error:', error);
        safeSend(socket, { type: ERROR, payload: { message: "Invalid move" } });
    }
}

function validatePawnPromotion(board: Chess, move: Move): boolean {
    const piece = board.get(move.from as any);
    const isPawn = piece?.type === 'p';
    const isLastRank = (piece?.color === 'w' && move.to[1] === '8') || 
                      (piece?.color === 'b' && move.to[1] === '1');
    if (isPawn && isLastRank) {
        return isValidPromotion(move.promotion);
    }
    return true;
}

function isValidPromotion(promotion: any): promotion is 'q' | 'r' | 'b' | 'n' {
    return ['q', 'r', 'b', 'n'].includes(promotion);
}

async function executeMove(game: MultiplayerGame, move: Move, moveResult: any): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        game.board.move(move);
        const moveNum = game.moveCount + 1;
        const san = moveResult.san;
        const fen = game.board.fen();
        await tx.move.create({
            data: {
                gameId: game.dbId,
                moveNum,
                from: move.from,
                to: move.to,
                san,
                fen
            }
        });
        game.moveCount = moveNum;
    });
}

async function checkAndHandleGameOver(state: GameState, game: MultiplayerGame): Promise<void> {
    const gameOverResult = checkGameOver(game.board);
    if (!gameOverResult.isOver) return;
    const gameOverMessage = {
        type: GAME_OVER,
        payload: { 
            winner: gameOverResult.winner,
            reason: gameOverResult.reason
        }
    };
    if (game.player1) safeSend(game.player1, gameOverMessage);
    if (game.player2) safeSend(game.player2, gameOverMessage);
    await prisma.game.update({
        where: { id: game.dbId },
        data: { status: 'COMPLETED' }
    });
    state.games = state.games.filter(g => g !== game);
}

async function handleSinglePlayerMove(state: GameState, game: SinglePlayerGame, socket: ServerWebSocket, move: Move): Promise<void> {
    try {
        // Simple and efficient move validation using chess.js
        const testBoard = new Chess(game.board.fen());
        const moveResult = testBoard.move(move);
        if (!moveResult) {
            safeSend(socket, { type: ERROR, payload: { message: "Illegal move" } });
            return;
        }

        // Save player move to database if game has dbId
        if (game.dbId) {
            await prisma.move.create({
                data: {
                    gameId: game.dbId,
                    moveNum: game.board.history().length + 1,
                    from: move.from,
                    to: move.to,
                    san: moveResult.san,
                    fen: game.board.fen()
                }
            });
        }
        
        game.board.move(move);
        safeSend(socket, { type: MOVE, payload: { move } });

        const gameOverResult = checkGameOver(game.board);
        if (gameOverResult.isOver) {
            safeSend(socket, { type: GAME_OVER, payload: gameOverResult });
            state.singlePlayerGames = state.singlePlayerGames.filter(g => g !== game);
            return;
        }

        // Schedule AI move
        setTimeout(async () => {
            try {
                const aiMove = generateAIMove(game.board, game.difficulty);

                if (aiMove) {
                    // Save AI move to database if game has dbId
                    if (game.dbId) {
                        const testBoard = new Chess(game.board.fen());
                        const moveResult = testBoard.move(aiMove);
                        
                        await prisma.move.create({
                            data: {
                                gameId: game.dbId,
                                moveNum: game.board.history().length + 1,
                                from: aiMove.from,
                                to: aiMove.to,
                                san: moveResult.san,
                                fen: testBoard.fen()
                            }
                        });
                    }
                    
                    // Apply move to game board
                    game.board.move(aiMove);
                    safeSend(socket, { type: MOVE, payload: { move: aiMove } });

                    const aiGameOverResult = checkGameOver(game.board);
                    if (aiGameOverResult.isOver) {
                        safeSend(socket, { type: GAME_OVER, payload: aiGameOverResult });
                        state.singlePlayerGames = state.singlePlayerGames.filter(g => g !== game);
                    }
                } else {
                    // No moves available - game might be over
                    const fallbackGameOver = checkGameOver(game.board);
                    if (fallbackGameOver.isOver) {
                        safeSend(socket, { type: GAME_OVER, payload: fallbackGameOver });
                        state.singlePlayerGames = state.singlePlayerGames.filter(g => g !== game);
                    }
                }
            } catch (error) {
                console.error('[AI] Error during AI move logic:', error);
                const fallbackGameOver = checkGameOver(game.board);
                if (fallbackGameOver.isOver) {
                    safeSend(socket, { type: GAME_OVER, payload: fallbackGameOver });
                    state.singlePlayerGames = state.singlePlayerGames.filter(g => g !== game);
                }
            }
        }, getAIThinkingDelay(game.difficulty));

    } catch (error) {
        console.error('[SinglePlayer] Error during player move processing:', error);
        safeSend(socket, { type: ERROR, payload: { message: "Invalid move" } });
    }
}

function generateAIMove(board: Chess, difficulty: AIDifficulty): Move | null {
    const possibleMoves = board.moves({ verbose: true });
    if (possibleMoves.length === 0) return null;

    switch (difficulty) {
        case 'easy':
            return generateEasyMove(board, possibleMoves);
        case 'medium':
            return generateMediumMove(board, possibleMoves);
        case 'hard':
            const hardMove = generateHardMove(board, possibleMoves);
            return hardMove; // This can now be null
        default:
            return generateEasyMove(board, possibleMoves);
    }
}

function generateEasyMove(board: Chess, possibleMoves: any[]): Move {
    const captures = possibleMoves.filter(move => move.captured);
    const moves = captures.length > 0 && Math.random() < 0.3 ? captures : possibleMoves;
    const randomMove = moves[Math.floor(Math.random() * moves.length)];

    return {
        from: randomMove.from,
        to: randomMove.to,
        promotion: isValidPromotion(randomMove.promotion) ? randomMove.promotion : undefined
    };
}

function generateMediumMove(board: Chess, possibleMoves: any[]): Move {
    let bestMove = possibleMoves[0];
    let bestScore = -Infinity;

    for (const move of possibleMoves) {
        const testBoard = new Chess(board.fen());
        testBoard.move(move);

        // Evaluate from AI's perspective (black)
        let score = evaluatePosition(testBoard, true);
        
        // Bonus for captures
        if (move.captured) {
            score += getPieceValue(move.captured) * 0.5;
        }
        
        // Bonus for giving check
        if (testBoard.inCheck()) {
            score += 50;
        }

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return {
        from: bestMove.from,
        to: bestMove.to,
        promotion: isValidPromotion(bestMove.promotion) ? bestMove.promotion : undefined
    };
}
function generateHardMove(board: Chess, possibleMoves: any[]): Move | null {
    const result = minimaxMove(board, 3, -Infinity, Infinity, true);
    return result.move;
}

function minimaxMove(board: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean): { move: Move | null, score: number } {
    const possibleMoves = board.moves({ verbose: true });

    if (depth === 0 || possibleMoves.length === 0) {
        // Fix: Return null move if no moves available, let caller handle it
        const defaultMove = possibleMoves[0] ? {
            from: possibleMoves[0].from,
            to: possibleMoves[0].to,
            promotion: isValidPromotion(possibleMoves[0].promotion) ? possibleMoves[0].promotion : undefined
        } : null;
        return { move: defaultMove, score: evaluatePosition(board) };
    }

    let bestMove = possibleMoves[0];
    let bestScore = isMaximizing ? -Infinity : Infinity;

    for (const move of possibleMoves) {
        const testBoard = new Chess(board.fen());
        testBoard.move(move);
        const result = minimaxMove(testBoard, depth - 1, alpha, beta, !isMaximizing);

        if (isMaximizing && result.score > bestScore) {
            bestScore = result.score;
            bestMove = move;
            alpha = Math.max(alpha, bestScore);
        } else if (!isMaximizing && result.score < bestScore) {
            bestScore = result.score;
            bestMove = move;
            beta = Math.min(beta, bestScore);
        }

        if (beta <= alpha) break;
    }

    return {
        move: bestMove ? {
            from: bestMove.from,
            to: bestMove.to,
            promotion: isValidPromotion(bestMove.promotion) ? bestMove.promotion : undefined
        } : null,
        score: bestScore
    };
}

function evaluatePosition(board: Chess, forBlack: boolean = true): number {
    if (board.isCheckmate()) {
        const winner = board.turn() === 'w' ? 'black' : 'white';
        if (forBlack) {
            return winner === 'black' ? 10000 : -10000;
        } else {
            return winner === 'white' ? 10000 : -10000;
        }
    }
    
    if (board.isDraw()) return 0;

    let score = 0;
    const pieces = board.board();
    
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = pieces[i][j];
            if (piece) {
                const value = getPieceValue(piece.type) + getPositionValue(piece.type, i, j, piece.color);
                if (forBlack) {
                    // For black AI: black pieces are positive, white pieces are negative
                    score += piece.color === 'b' ? value : -value;
                } else {
                    // For white AI: white pieces are positive, black pieces are negative
                    score += piece.color === 'w' ? value : -value;
                }
            }
        }
    }

    // Mobility bonus
    score += board.moves().length * 0.1 * (forBlack ? 1 : -1);
    
    return score;
}
function getPieceValue(type: string): number {
    return { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 }[type] || 0;
}

function getPositionValue(type: string, row: number, col: number, color: string): number {
    const centerDistance = Math.abs(row - 3.5) + Math.abs(col - 3.5);
    let bonus = (7 - centerDistance) * 2;
    if (type === 'p') bonus += color === 'w' ? (7 - row) * 5 : row * 5;
    return bonus;
}

function getAIThinkingDelay(difficulty: AIDifficulty): number {
    switch (difficulty) {
        case 'easy': return 300 + Math.random() * 200;
        case 'medium': return 800 + Math.random() * 400;
        case 'hard': return 1500 + Math.random() * 1000;
        default: return 500;
    }
}

function checkGameOver(board: Chess): { isOver: boolean; winner: string | null; reason: string } {
    if (board.isCheckmate()) return { isOver: true, winner: board.turn() === 'w' ? 'black' : 'white', reason: 'checkmate' };
    if (board.isDraw()) {
        if (board.isStalemate()) return { isOver: true, winner: null, reason: 'stalemate' };
        if (board.isThreefoldRepetition()) return { isOver: true, winner: null, reason: 'threefold_repetition' };
        if (board.isInsufficientMaterial()) return { isOver: true, winner: null, reason: 'insufficient_material' };
        return { isOver: true, winner: null, reason: 'fifty_move_rule' };
    }
    return { isOver: false, winner: null, reason: '' };
}
