import { StockfishClient } from '../engine/stockfishClient';
type Side = 'w' | 'b';
export type Evaluation = {
    move: string;
    scoreCp: number;
    scoreText: string;
};
export declare function findWorstMove(engine: StockfishClient, fen: string, side: Side, opts: {
    perMoveMs: number;
    maxMoves?: number;
}): Promise<{
    move: string;
    scoreText: string;
} | null>;
export {};
