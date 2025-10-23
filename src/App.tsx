import { useEffect, useMemo, useRef, useState } from 'react';
import 'chessboard-element';
import { fenToObj } from 'chessboard-element';
import { create } from 'zustand';
import { clsx } from 'clsx';
import { ensureValidKings, fenHasKings, piecePlacementFromBoard } from './utils/fen';
import { StockfishClient } from './engine/stockfishClient';
import { findWorstMove } from './logic/worstMove';
import type { ChessBoardElement } from './types/chessboard-element';

type Side = 'w' | 'b';

type StoreState = {
  sideToMove: Side;
  setSideToMove: (s: Side) => void;
};

const useStore = create<StoreState>((set) => ({
  sideToMove: 'w',
  setSideToMove: (s) => set({ sideToMove: s }),
}));

export default function App() {
  const boardRef = useRef<ChessBoardElement | null>(null);
  const [engine, setEngine] = useState<StockfishClient | null>(null);
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [liveDepth, setLiveDepth] = useState<number | undefined>(undefined);
  const [liveNps, setLiveNps] = useState<number | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const sideToMove = useStore((s) => s.sideToMove);
  const setSideToMove = useStore((s) => s.setSideToMove);

  useEffect(() => {
    const e = new StockfishClient();
    e.start().then(() => setStatus('Engine ready'));
    setEngine(e);
    return () => e.terminate();
  }, []);

  useEffect(() => {
    // Set start position on mount and prevent dragging kings from the spare tray
    const el = boardRef.current;
    if (el) {
      try { el.start(false); } catch {}
      const preventKingDrag = (ev: any) => {
        const { source, piece } = ev.detail || {};
        if (source === 'spare' && (piece === 'wK' || piece === 'bK')) {
          ev.preventDefault();
        }
      };
      const preventKingRemovalOrReplacement = (ev: any) => {
        const { piece, target, newPosition, setAction } = ev.detail || {};
        // Disallow replacing/capturing a piece of the same color
        try {
          if (typeof target === 'string' && target !== 'offboard' && piece && el) {
            const placementBefore = piecePlacementFromBoard(el as any);
            const beforeObj = fenToObj(placementBefore) as Record<string, string> | false;
            if (beforeObj && typeof beforeObj === 'object') {
              const occupant = (beforeObj as Record<string, string>)[target];
              if (occupant && occupant[0] === (piece as string)[0]) {
                setAction('snapback');
                return;
              }
            }
          }
        } catch {}
        // Block dropping a king offboard
        if (target === 'offboard' && (piece === 'wK' || piece === 'bK')) {
          setAction('snapback');
          return;
        }
        // Ensure both kings remain on the board after the drop
        if (newPosition && typeof newPosition === 'object') {
          const vals: string[] = Object.values(newPosition as Record<string, string>);
          const wK = vals.filter((p) => p === 'wK').length === 1;
          const bK = vals.filter((p) => p === 'bK').length === 1;
          if (!wK || !bK) {
            setAction('snapback');
          }
        }
      };
      el.addEventListener('drag-start', preventKingDrag as any);
      el.addEventListener('drop', preventKingRemovalOrReplacement as any);
      return () => {
        el.removeEventListener('drag-start', preventKingDrag as any);
        el.removeEventListener('drop', preventKingRemovalOrReplacement as any);
      };
    }
  }, []);

  // Hide kings in the spare tray by mutating the shadow DOM; reapply on updates
  useEffect(() => {
    const el = boardRef.current as any;
    if (!el || !el.shadowRoot) return;
    const hide = () => {
      try {
        const sr: ShadowRoot = el.shadowRoot;
        const wk = sr.getElementById('spare-wK') as HTMLElement | null;
        const bk = sr.getElementById('spare-bK') as HTMLElement | null;
        if (wk) wk.style.display = 'none';
        if (bk) bk.style.display = 'none';
      } catch {}
    };
    hide();
    const containers = Array.from(el.shadowRoot.querySelectorAll('[part~="spare-pieces"]')) as Element[];
    const obs = new MutationObserver(() => hide());
    for (const c of containers) {
      obs.observe(c, { childList: true, subtree: true });
    }
    return () => obs.disconnect();
  }, []);

  const orientation = useMemo(() => (sideToMove === 'w' ? 'white' : 'black'), [sideToMove]);

  function clearBoard() {
    if (!boardRef.current) return;
    // Keep only kings on their current squares
    try {
      const placement = piecePlacementFromBoard(boardRef.current);
      const pos = fenToObj(placement) as Record<string, string> | false;
      const filtered: Record<string, string> = {};
      if (pos && typeof pos === 'object') {
        for (const [sq, pc] of Object.entries(pos)) {
          if (pc === 'wK' || pc === 'bK') filtered[sq] = pc;
        }
      }
      boardRef.current.setPosition(filtered, false);
    } catch {
      boardRef.current.clear(false);
    }
  }

  function startPosition() {
    if (!boardRef.current) return;
    boardRef.current.start(false);
  }

  async function onFindWorst() {
    setResult('');
    if (!engine || !boardRef.current) return;
    const placement = piecePlacementFromBoard(boardRef.current);
    if (!fenHasKings(placement)) {
      setStatus('Position must contain exactly one white king (K) and one black king (k).');
      return;
    }
    const fen = `${placement} ${sideToMove} - - 0 1`;
    setStatus('Analyzing...');
    setIsAnalyzing(true);
    setLiveDepth(undefined);
    setLiveNps(undefined);
    try {
      // Use bounded search per user preference: max depth 3, movetime 1000ms
      const w = await findWorstMove(engine, fen, sideToMove, { depth: 3, perMoveMs: 1000, maxMoves: 80, onInfo: (s) => {
        if (s.depth !== undefined) setLiveDepth(s.depth);
        if (s.nps !== undefined) setLiveNps(s.nps);
      }});
      if (w) {
        setResult(`${w.move} (opponent score: ${w.scoreText})`);
        // Optionally apply the move visually if supported by the element
        try { (boardRef.current as any)?.move?.(w.move); } catch {}
      } else {
        setResult('No legal moves.');
      }
      setStatus('Done');
    } catch (err) {
      setStatus(String(err));
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%' }}>
      <header style={{ padding: 12, borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>Blunder or Gambit</h1>
        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <label>Side to move:</label>
          <select value={sideToMove} onChange={(e) => setSideToMove(e.target.value as Side)}>
            <option value="w">White</option>
            <option value="b">Black</option>
          </select>
        </div>
        <button onClick={onFindWorst}>Find worst move</button>
        <button onClick={clearBoard}>Clear</button>
        <button onClick={startPosition}>Start position</button>
        <span style={{ marginLeft: 'auto', color: '#6b7280' }}>{status}</span>
      </header>
      <main style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 560px) 1fr', gap: 16, padding: 16 }}>
        <div>
          <chess-board
            ref={boardRef as any}
            id="board"
            draggable-pieces
            spare-pieces
            drop-off-board="trash"
            orientation={orientation}
            style={{ width: 'min(90vw, 560px)' }}
          ></chess-board>
          <p style={{ marginTop: 12 }}>
            <strong>Worst move:</strong>
            {isAnalyzing ? (
              <span style={{ color: '#6b7280', marginLeft: 8 }}>
                {liveDepth !== undefined ? `depth ${liveDepth}` : ''}
                {liveNps !== undefined ? `${liveDepth !== undefined ? '  ' : ''}knps ${Math.round((liveNps || 0)/1000)}` : ''}
              </span>
            ) : null}
            {result ? <span style={{ marginLeft: 8 }}>{result}</span> : null}
          </p>
        </div>
        <div style={{ fontSize: 14, color: '#374151' }}>
          <p>Drag pieces from the tray onto the board. Drag off to remove. Kings cannot be added from the tray, removed, captured, or replaced.</p>
        </div>
      </main>
      
    </div>
  );
}


