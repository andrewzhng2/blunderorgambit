function evalToOpponentScoreText(score, side) {
    if (!score)
        return { value: 0, text: '0.0' };
    if (typeof score.mate === 'number') {
        const val = score.mate > 0 ? 10000 : -10000;
        // After our move, if mate > 0 it's mate in our favor; opponent score is opposite
        const opp = -val;
        return { value: opp, text: score.mate > 0 ? 'mate for us' : 'mate for opponent' };
    }
    const cp = score.cp ?? 0;
    // After our move, Stockfish's cp is for side to move (opponent). So opponent advantage = cp directly
    return { value: cp, text: (cp / 100).toFixed(2) };
}
export async function findWorstMove(engine, fen, side, opts) {
    await engine.newGame();
    await engine.setPositionFen(fen);
    const legal = await engine.getLegalMoves();
    if (legal.length === 0)
        return null;
    const limit = Math.min(legal.length, opts.maxMoves ?? legal.length);
    let worst = null;
    for (let i = 0; i < limit; i++) {
        const m = legal[i];
        engine.setPositionFenWithMoves(fen, [m]);
        const score = await engine.evaluateCurrentPositionMovetime(opts.perMoveMs);
        const { value, text } = evalToOpponentScoreText(score, side);
        if (!worst || value > worst.value) {
            worst = { move: m, value, text };
        }
    }
    if (!worst)
        return null;
    return { move: worst.move, scoreText: worst.text };
}
