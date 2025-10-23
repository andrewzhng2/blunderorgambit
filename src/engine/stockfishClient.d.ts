export declare class StockfishClient {
    private worker;
    private listeners;
    constructor();
    start(): Promise<void>;
    terminate(): void;
    private post;
    send(cmd: string): void;
    private onLine;
    private offLine;
    private awaitLine;
    private awaitReady;
    newGame(): Promise<void>;
    setPositionFen(fen: string): Promise<void>;
    setPositionFenWithMoves(fen: string, moves: string[]): void;
    getLegalMoves(): Promise<string[]>;
    evaluateCurrentPositionMovetime(ms: number): Promise<{
        cp?: number;
        mate?: number;
    } & {
        raw: string;
    } | null>;
}
