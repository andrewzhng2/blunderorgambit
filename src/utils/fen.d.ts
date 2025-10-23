import type { ChessBoardElement } from '../types/chessboard-element';
export declare function piecePlacementFromBoard(board: ChessBoardElement): string;
export declare function fenHasKings(placement: string): boolean;
export declare function ensureValidKings(placement: string): string;
