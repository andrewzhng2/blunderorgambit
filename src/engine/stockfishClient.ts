type Listener = (line: string) => void;

function parseLines(onLine: Listener) {
  return (e: MessageEvent<string>) => {
    const data = String(e.data);
    for (const line of data.split(/\r?\n/)) {
      if (line) onLine(line);
    }
  };
}

export class StockfishClient {
  private worker: Worker;
  private listeners: Set<Listener> = new Set();

  constructor() {
    // Use wrapper worker to normalize messaging for asm.js builds
    const base = (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');
    this.worker = new Worker(`${base}stockfish.worker.js`);
  }

  async start(): Promise<void> {
    await this.awaitReady();
  }

  terminate(): void {
    this.worker.terminate();
  }

  private post(cmd: string): void {
    this.worker.postMessage(cmd);
  }

  public send(cmd: string): void {
    this.post(cmd);
  }

  private onLine(cb: Listener): void {
    this.listeners.add(cb);
  }

  private offLine(cb: Listener): void {
    this.listeners.delete(cb);
  }

  private awaitLine(match: RegExp): Promise<string> {
    return new Promise((resolve) => {
      const handler: Listener = (line) => {
        if (match.test(line)) {
          this.offLine(handler);
          resolve(line);
        }
      };
      this.onLine(handler);
    });
  }

  private awaitReady(): Promise<void> {
    return new Promise((resolve) => {
      const handle = parseLines((l) => {
        for (const fn of this.listeners) fn(l);
      });
      this.worker.addEventListener('message', handle as any);
      this.post('uci');
      this.awaitLine(/^uciok/)
        .then(() => {
          this.post('isready');
          return this.awaitLine(/^readyok/);
        })
        .then(() => resolve());
    });
  }

  async newGame(): Promise<void> {
    this.post('ucinewgame');
    this.post('isready');
    await this.awaitLine(/^readyok/);
  }

  async setPositionFen(fen: string): Promise<void> {
    this.post(`position fen ${fen}`);
  }

  setPositionFenWithMoves(fen: string, moves: string[]): void {
    const tail = moves.length ? ` moves ${moves.join(' ')}` : '';
    this.post(`position fen ${fen}${tail}`);
  }

  async getLegalMoves(): Promise<string[]> {
    const moves: string[] = [];
    const waitForMoves = () => new Promise<void>((resolve) => {
      const handler: Listener = (line) => {
        if (/^Legal (uci\s+)?moves/i.test(line)) {
          const listed = line.replace(/^Legal (uci\s+)?moves:?\s*/i, '').trim();
          for (const m of listed.split(/\s+/)) if (m) moves.push(m);
          this.offLine(handler);
          resolve();
        } else if (/^Key is/i.test(line)) {
          // End of 'd' output on some builds; resolve even if no moves parsed yet
          this.offLine(handler);
          resolve();
        }
      };
      this.onLine(handler);
    });

    // Ensure engine ready before asking for debug output
    this.post('isready');
    await this.awaitLine(/^readyok/);
    this.post('d');
    await waitForMoves();
    return moves;
  }

  async evaluateCurrentPosition(
    options: { movetime?: number; depth?: number },
    onInfo?: (stats: { depth?: number; nps?: number }) => void
  ): Promise<{ cp?: number; mate?: number } & { raw: string } | null> {
    let lastInfo: string | null = null;
    const done = new Promise<void>((resolve) => {
      const handler: Listener = (line) => {
        if (line.startsWith('info')) {
          lastInfo = line;
          if (onInfo) {
            const depthMatch = line.match(/\bdepth\s+(\d+)/);
            const npsMatch = line.match(/\bnps\s+(\d+)/);
            const stats: { depth?: number; nps?: number } = {};
            if (depthMatch) stats.depth = Number(depthMatch[1]);
            if (npsMatch) stats.nps = Number(npsMatch[1]);
            if (stats.depth !== undefined || stats.nps !== undefined) onInfo(stats);
          }
        }
        if (line.startsWith('bestmove')) {
          this.offLine(handler);
          resolve();
        }
      };
      this.onLine(handler);
    });
    const parts: string[] = ['go', 'nodes', '999999'];
    if (options.depth !== undefined) parts.push('depth', String(options.depth));
    if (options.movetime !== undefined) parts.push('movetime', String(options.movetime));
    this.post(parts.join(' '));
    await done; // no safety timeout per user preference
    if (!lastInfo) return null;
    const m = (lastInfo as string).match(/score (cp (-?\d+)|mate (-?\d+))/);
    if (!m) return { raw: lastInfo } as any;
    if (m[2]) return { cp: Number(m[2]), raw: lastInfo };
    return { mate: Number(m[3]), raw: lastInfo };
  }
}


