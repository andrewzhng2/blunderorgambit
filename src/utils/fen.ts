import type { ChessBoardElement } from '../types/chessboard-element';

export function piecePlacementFromBoard(board: ChessBoardElement): string {
  const raw = board.fen?.();
  if (typeof raw === 'string' && raw.includes('/')) {
    const parts = raw.trim().split(/\s+/);
    return parts[0];
  }
  return '8/8/8/8/8/8/8/8';
}

export function fenHasKings(placement: string): boolean {
  const hasWhite = /K/.test(placement);
  const hasBlack = /k/.test(placement);
  // ensure exactly one each
  const whiteCount = (placement.match(/K/g) || []).length;
  const blackCount = (placement.match(/k/g) || []).length;
  return hasWhite && hasBlack && whiteCount === 1 && blackCount === 1;
}

export function ensureValidKings(placement: string): string {
  if (!fenHasKings(placement)) {
    throw new Error('Exactly one white king and one black king are required.');
  }
  return placement;
}


