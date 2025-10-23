function parseLines(onLine) {
    return (e) => {
        const data = String(e.data);
        for (const line of data.split(/\r?\n/)) {
            if (line)
                onLine(line);
        }
    };
}
export class StockfishClient {
    constructor() {
        Object.defineProperty(this, "worker", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "listeners", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
        this.worker = new Worker('/stockfish.js');
    }
    async start() {
        await this.awaitReady();
    }
    terminate() {
        this.worker.terminate();
    }
    post(cmd) {
        this.worker.postMessage(cmd);
    }
    send(cmd) {
        this.post(cmd);
    }
    onLine(cb) {
        this.listeners.add(cb);
    }
    offLine(cb) {
        this.listeners.delete(cb);
    }
    awaitLine(match) {
        return new Promise((resolve) => {
            const handler = (line) => {
                if (match.test(line)) {
                    this.offLine(handler);
                    resolve(line);
                }
            };
            this.onLine(handler);
        });
    }
    awaitReady() {
        return new Promise((resolve) => {
            const handle = parseLines((l) => {
                for (const fn of this.listeners)
                    fn(l);
            });
            this.worker.addEventListener('message', handle);
            this.post('uci');
            this.awaitLine(/^uciok/)
                .then(() => {
                this.post('isready');
                return this.awaitLine(/^readyok/);
            })
                .then(() => resolve());
        });
    }
    async newGame() {
        this.post('ucinewgame');
        this.post('isready');
        await this.awaitLine(/^readyok/);
    }
    async setPositionFen(fen) {
        this.post(`position fen ${fen}`);
    }
    setPositionFenWithMoves(fen, moves) {
        const tail = moves.length ? ` moves ${moves.join(' ')}` : '';
        this.post(`position fen ${fen}${tail}`);
    }
    async getLegalMoves() {
        const moves = [];
        const done = new Promise((resolve) => {
            const handler = (line) => {
                if (/^Legal (uci\s+)?moves/.test(line)) {
                    const listed = line.replace(/^Legal (uci\s+)?moves:?\s*/i, '').trim();
                    for (const m of listed.split(/\s+/))
                        if (m)
                            moves.push(m);
                    this.offLine(handler);
                    resolve();
                }
            };
            this.onLine(handler);
        });
        this.post('d');
        await done;
        return moves;
    }
    async evaluateCurrentPositionMovetime(ms) {
        let lastInfo = null;
        const done = new Promise((resolve) => {
            const handler = (line) => {
                if (line.startsWith('info'))
                    lastInfo = line;
                if (line.startsWith('bestmove')) {
                    this.offLine(handler);
                    resolve();
                }
            };
            this.onLine(handler);
        });
        this.post(`go movetime ${ms}`);
        await done;
        if (!lastInfo)
            return null;
        const m = lastInfo.match(/score (cp (-?\d+)|mate (-?\d+))/);
        if (!m)
            return { raw: lastInfo };
        if (m[2])
            return { cp: Number(m[2]), raw: lastInfo };
        return { mate: Number(m[3]), raw: lastInfo };
    }
}
