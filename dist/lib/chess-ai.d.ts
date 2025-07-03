import { Chess, Move } from 'chess.js';
export type AIDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export declare class ChessAI {
    private difficulty;
    private config;
    private transpositionTable;
    constructor(difficulty?: AIDifficulty);
    setDifficulty(difficulty: AIDifficulty): void;
    getBestMove(chess: Chess): Promise<Move | null>;
    private getOpeningMove;
    private minimax;
    private orderMoves;
    private evaluatePosition;
    private getPieceSquareValue;
    private evaluateKingSafety;
    private findKingSquare;
}
export declare const chessAI: ChessAI;
//# sourceMappingURL=chess-ai.d.ts.map