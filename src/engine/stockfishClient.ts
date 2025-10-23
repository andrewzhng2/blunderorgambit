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
    this.worker = new Worker('/stockfish.js');
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
      this.awaitLine(/^uciok/).then(() => {
        this.post('isready');
        this.awaitLine(/^readyok/).then(() => resolve());
      });
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
    const done = new Promise<void>((resolve) => {
      const handler: Listener = (line) => {
        if (line.startsWith('Legal moves:')) {
          const listed = line.slice('Legal moves:'.length).trim();
          for (const m of listed.split(/\s+/)) if (m) moves.push(m);
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

  async evaluateCurrentPositionMovetime(ms: number): Promise<{ cp?: number; mate?: number } & { raw: string } | null> {
    let lastInfo: string | null = null;
    const done = new Promise<void>((resolve) => {
      const handler: Listener = (line) => {
        if (line.startsWith('info')) lastInfo = line;
        if (line.startsWith('bestmove')) {
          this.offLine(handler);
          resolve();
        }
      };
      this.onLine(handler);
    });
    this.post(`go movetime ${ms}`);
    await done;
    if (!lastInfo) return null;
    const m = lastInfo.match(/score (cp (-?\d+)|mate (-?\d+))/);
    if (!m) return { raw: lastInfo } as any;
    if (m[2]) return { cp: Number(m[2]), raw: lastInfo };
    return { mate: Number(m[3]), raw: lastInfo };
  }
}


