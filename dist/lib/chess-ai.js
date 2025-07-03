"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chessAI = exports.ChessAI = void 0;
const AI_CONFIGS = {
    beginner: { depth: 1, thinkingTime: 500 },
    intermediate: { depth: 2, thinkingTime: 1000 },
    advanced: { depth: 3, thinkingTime: 1500 },
    expert: { depth: 4, thinkingTime: 2000 }
};
// Piece values for material evaluation
const PIECE_VALUES = {
    p: 100, // pawn
    n: 320, // knight
    b: 330, // bishop
    r: 500, // rook
    q: 900, // queen
    k: 20000 // king
};
// Piece-square tables for positional evaluation
const PIECE_SQUARE_TABLES = {
    p: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5, 5, 10, 25, 25, 10, 5, 5],
        [0, 0, 0, 20, 20, 0, 0, 0],
        [5, -5, -10, 0, 0, -10, -5, 5],
        [5, 10, 10, -20, -20, 10, 10, 5],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ],
    n: [
        [-50, -40, -30, -30, -30, -30, -40, -50],
        [-40, -20, 0, 0, 0, 0, -20, -40],
        [-30, 0, 10, 15, 15, 10, 0, -30],
        [-30, 5, 15, 20, 20, 15, 5, -30],
        [-30, 0, 15, 20, 20, 15, 0, -30],
        [-30, 5, 10, 15, 15, 10, 5, -30],
        [-40, -20, 0, 5, 5, 0, -20, -40],
        [-50, -40, -30, -30, -30, -30, -40, -50]
    ],
    b: [
        [-20, -10, -10, -10, -10, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 10, 10, 5, 0, -10],
        [-10, 5, 5, 10, 10, 5, 5, -10],
        [-10, 0, 10, 10, 10, 10, 0, -10],
        [-10, 10, 10, 10, 10, 10, 10, -10],
        [-10, 5, 0, 0, 0, 0, 5, -10],
        [-20, -10, -10, -10, -10, -10, -10, -20]
    ],
    r: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [5, 10, 10, 10, 10, 10, 10, 5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [0, 0, 0, 5, 5, 0, 0, 0]
    ],
    q: [
        [-20, -10, -10, -5, -5, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 5, 5, 5, 0, -10],
        [-5, 0, 5, 5, 5, 5, 0, -5],
        [0, 0, 5, 5, 5, 5, 0, -5],
        [-10, 5, 5, 5, 5, 5, 0, -10],
        [-10, 0, 5, 0, 0, 0, 0, -10],
        [-20, -10, -10, -5, -5, -10, -10, -20]
    ],
    k: [
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-20, -30, -30, -40, -40, -30, -30, -20],
        [-10, -20, -20, -20, -20, -20, -20, -10],
        [20, 20, 0, 0, 0, 0, 20, 20],
        [20, 30, 10, 0, 0, 10, 30, 20]
    ]
};
// Opening book - simple opening moves
const OPENING_MOVES = [
    'e2e4', 'd2d4', 'g1f3', 'b1c3', 'f1c4', 'c2c4'
];
class ChessAI {
    constructor(difficulty = 'intermediate') {
        this.difficulty = difficulty;
        this.config = AI_CONFIGS[difficulty];
        this.transpositionTable = new Map();
    }
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.config = AI_CONFIGS[difficulty];
        this.transpositionTable.clear(); // Clear cache when difficulty changes
    }
    async getBestMove(chess) {
        // Add thinking delay for better UX
        await new Promise(resolve => setTimeout(resolve, this.config.thinkingTime));
        // Check for opening moves
        const history = chess.history();
        if (history.length < 6) {
            const openingMove = this.getOpeningMove(chess);
            if (openingMove)
                return openingMove;
        }
        // Use minimax to find best move
        const result = this.minimax(chess, this.config.depth, -Infinity, Infinity, true);
        return result.move || null;
    }
    getOpeningMove(chess) {
        const legalMoves = chess.moves({ verbose: true });
        const openingMoves = legalMoves.filter(move => OPENING_MOVES.includes(move.from + move.to));
        if (openingMoves.length > 0) {
            return openingMoves[Math.floor(Math.random() * openingMoves.length)];
        }
        return null;
    }
    minimax(chess, depth, alpha, beta, maximizingPlayer) {
        const fen = chess.fen();
        // Check transposition table
        const cached = this.transpositionTable.get(fen);
        if (cached && cached.depth >= depth) {
            return { score: cached.score, move: cached.move };
        }
        // Base case: depth 0 or game over
        if (depth === 0 || chess.isGameOver()) {
            const score = this.evaluatePosition(chess);
            return { score };
        }
        const moves = this.orderMoves(chess, chess.moves({ verbose: true }));
        let bestMove;
        if (maximizingPlayer) {
            let maxEval = -Infinity;
            for (const move of moves) {
                chess.move(move);
                const evaluation = this.minimax(chess, depth - 1, alpha, beta, false);
                chess.undo();
                if (evaluation.score > maxEval) {
                    maxEval = evaluation.score;
                    bestMove = move;
                }
                alpha = Math.max(alpha, evaluation.score);
                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }
            const result = { score: maxEval, move: bestMove };
            this.transpositionTable.set(fen, { score: maxEval, depth, move: bestMove });
            return result;
        }
        else {
            let minEval = Infinity;
            for (const move of moves) {
                chess.move(move);
                const evaluation = this.minimax(chess, depth - 1, alpha, beta, true);
                chess.undo();
                if (evaluation.score < minEval) {
                    minEval = evaluation.score;
                    bestMove = move;
                }
                beta = Math.min(beta, evaluation.score);
                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }
            const result = { score: minEval, move: bestMove };
            this.transpositionTable.set(fen, { score: minEval, depth, move: bestMove });
            return result;
        }
    }
    orderMoves(chess, moves) {
        // Order moves for better alpha-beta pruning
        // Priority: captures, checks, then other moves
        return moves.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;
            // Prioritize captures
            if (a.captured)
                scoreA += 100;
            if (b.captured)
                scoreB += 100;
            // Prioritize checks
            chess.move(a);
            if (chess.inCheck())
                scoreA += 50;
            chess.undo();
            chess.move(b);
            if (chess.inCheck())
                scoreB += 50;
            chess.undo();
            return scoreB - scoreA;
        });
    }
    evaluatePosition(chess) {
        if (chess.isCheckmate()) {
            return chess.turn() === 'w' ? -20000 : 20000;
        }
        if (chess.isDraw() || chess.isStalemate()) {
            return 0;
        }
        let score = 0;
        const board = chess.board();
        // Evaluate material and position
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = board[i][j];
                if (piece) {
                    const pieceValue = PIECE_VALUES[piece.type];
                    const positionValue = this.getPieceSquareValue(piece.type, i, j, piece.color === 'w');
                    const totalValue = pieceValue + positionValue;
                    score += piece.color === 'w' ? totalValue : -totalValue;
                }
            }
        }
        // Add mobility bonus
        const whiteMoves = chess.turn() === 'w' ? chess.moves().length : 0;
        chess.load(chess.fen().replace(' w ', ' b '));
        const blackMoves = chess.moves().length;
        chess.load(chess.fen().replace(' b ', ' w '));
        score += (whiteMoves - blackMoves) * 10;
        // Add king safety evaluation
        score += this.evaluateKingSafety(chess, 'w') - this.evaluateKingSafety(chess, 'b');
        return score;
    }
    getPieceSquareValue(pieceType, row, col, isWhite) {
        const table = PIECE_SQUARE_TABLES[pieceType];
        if (!table)
            return 0;
        // Flip the table for black pieces
        const adjustedRow = isWhite ? 7 - row : row;
        return table[adjustedRow][col];
    }
    evaluateKingSafety(chess, color) {
        // Simple king safety evaluation
        const king = chess.board().flat().find(piece => piece?.type === 'k' && piece.color === color);
        if (!king)
            return 0;
        // Penalize exposed king
        const kingSquare = this.findKingSquare(chess, color);
        if (!kingSquare)
            return 0;
        let safety = 0;
        // Check for pawn shield
        const direction = color === 'w' ? -1 : 1;
        const shieldSquares = [
            String.fromCharCode(kingSquare.charCodeAt(0) - 1) + (parseInt(kingSquare[1]) + direction),
            kingSquare[0] + (parseInt(kingSquare[1]) + direction),
            String.fromCharCode(kingSquare.charCodeAt(0) + 1) + (parseInt(kingSquare[1]) + direction)
        ];
        for (const square of shieldSquares) {
            try {
                const piece = chess.get(square);
                if (piece && piece.type === 'p' && piece.color === color) {
                    safety += 10;
                }
            }
            catch (e) {
                // Invalid square, ignore
            }
        }
        return safety;
    }
    findKingSquare(chess, color) {
        const board = chess.board();
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = board[i][j];
                if (piece && piece.type === 'k' && piece.color === color) {
                    return String.fromCharCode(97 + j) + (8 - i);
                }
            }
        }
        return null;
    }
}
exports.ChessAI = ChessAI;
// Export singleton instance
exports.chessAI = new ChessAI();
//# sourceMappingURL=chess-ai.js.map