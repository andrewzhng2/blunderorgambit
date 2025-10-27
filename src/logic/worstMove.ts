import { StockfishClient } from '../engine/stockfishClient';

type Side = 'w' | 'b';

export type Evaluation = {
  move: string;
  scoreCp: number; // positive is good for side to move in Stockfish output
  scoreText: string;
};

function evalToOpponentScoreText(score: { cp?: number; mate?: number } | null, side: Side): { value: number; text: string } {
  if (!score) return { value: 0, text: '0.0' };
  if (typeof score.mate === 'number') {
    const opponentWinning = score.mate > 0;
    const value = opponentWinning ? 10000 : -10000;
    return { value, text: opponentWinning ? 'mate for opponent' : 'mate for us' };
  }
  const cp = score.cp ?? 0;
  // After our move, Stockfish's cp is for side to move (opponent). So opponent advantage = cp directly
  return { value: cp, text: (cp / 100).toFixed(2) };
}

export async function findWorstMove(
  engine: StockfishClient,
  fen: string,
  side: Side,
  opts: { perMoveMs?: number; maxMoves?: number; depth?: number; onInfo?: (s: { depth?: number; nps?: number }) => void }
): Promise<{ move: string; scoreText: string } | null> {
  await engine.newGame();
  await engine.setPositionFen(fen);
  const legal = await engine.getLegalMoves();
  if (legal.length === 0) return null;
  const limit = Math.min(legal.length, opts.maxMoves ?? legal.length);

  let worst: { move: string; value: number; text: string } | null = null;
  for (let i = 0; i < limit; i++) {
    const m = legal[i];
    engine.setPositionFenWithMoves(fen, [m]);
    let score: { cp?: number; mate?: number } | null = null;
    try {
      // Bound search: cap depth to 3 and movetime to 1000ms
      const depth = Math.min(3, opts.depth ?? 3);
      const movetime = Math.min(1000, opts.perMoveMs ?? 1000);
      score = await engine.evaluateCurrentPosition({ depth, movetime }, opts.onInfo);
    } catch {
      // If this move times out, skip to keep UI responsive
      continue;
    }
    const { value, text } = evalToOpponentScoreText(score, side);
    if (!worst || value > worst.value) {
      worst = { move: m, value, text };
    }
  }
  if (!worst) return null;
  return { move: worst.move, scoreText: worst.text };
}


