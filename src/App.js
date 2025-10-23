import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import 'chessboard-element';
import { fenToObj } from 'chessboard-element';
import { create } from 'zustand';
import { fenHasKings, piecePlacementFromBoard } from './utils/fen';
import { StockfishClient } from './engine/stockfishClient';
import { findWorstMove } from './logic/worstMove';
const useStore = create((set) => ({
    sideToMove: 'w',
    setSideToMove: (s) => set({ sideToMove: s }),
}));
export default function App() {
    const boardRef = useRef(null);
    const [engine, setEngine] = useState(null);
    const [status, setStatus] = useState('');
    const [result, setResult] = useState('');
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
            try {
                el.start(false);
            }
            catch { }
            const preventKingDrag = (ev) => {
                const { source, piece } = ev.detail || {};
                if (source === 'spare' && (piece === 'wK' || piece === 'bK')) {
                    ev.preventDefault();
                }
            };
            const preventKingRemovalOrReplacement = (ev) => {
                const { piece, target, newPosition, setAction } = ev.detail || {};
                // Block dropping a king offboard
                if (target === 'offboard' && (piece === 'wK' || piece === 'bK')) {
                    setAction('snapback');
                    return;
                }
                // Ensure both kings remain on the board after the drop
                if (newPosition && typeof newPosition === 'object') {
                    const vals = Object.values(newPosition);
                    const wK = vals.filter((p) => p === 'wK').length === 1;
                    const bK = vals.filter((p) => p === 'bK').length === 1;
                    if (!wK || !bK) {
                        setAction('snapback');
                    }
                }
            };
            el.addEventListener('drag-start', preventKingDrag);
            el.addEventListener('drop', preventKingRemovalOrReplacement);
            return () => {
                el.removeEventListener('drag-start', preventKingDrag);
                el.removeEventListener('drop', preventKingRemovalOrReplacement);
            };
        }
    }, []);
    // Hide kings in the spare tray by mutating the shadow DOM; reapply on updates
    useEffect(() => {
        const el = boardRef.current;
        if (!el || !el.shadowRoot)
            return;
        const hide = () => {
            try {
                const sr = el.shadowRoot;
                const wk = sr.getElementById('spare-wK');
                const bk = sr.getElementById('spare-bK');
                if (wk)
                    wk.style.display = 'none';
                if (bk)
                    bk.style.display = 'none';
            }
            catch { }
        };
        hide();
        const containers = Array.from(el.shadowRoot.querySelectorAll('[part~="spare-pieces"]'));
        const obs = new MutationObserver(() => hide());
        for (const c of containers) {
            obs.observe(c, { childList: true, subtree: true });
        }
        return () => obs.disconnect();
    }, []);
    const orientation = useMemo(() => (sideToMove === 'w' ? 'white' : 'black'), [sideToMove]);
    function clearBoard() {
        if (!boardRef.current)
            return;
        // Keep only kings on their current squares
        try {
            const placement = piecePlacementFromBoard(boardRef.current);
            const pos = fenToObj(placement);
            const filtered = {};
            if (pos && typeof pos === 'object') {
                for (const [sq, pc] of Object.entries(pos)) {
                    if (pc === 'wK' || pc === 'bK')
                        filtered[sq] = pc;
                }
            }
            boardRef.current.setPosition(filtered, false);
        }
        catch {
            boardRef.current.clear(false);
        }
    }
    function startPosition() {
        if (!boardRef.current)
            return;
        boardRef.current.start(false);
    }
    async function onFindWorst() {
        setResult('');
        if (!engine || !boardRef.current)
            return;
        const placement = piecePlacementFromBoard(boardRef.current);
        if (!fenHasKings(placement)) {
            setStatus('Position must contain exactly one white king (K) and one black king (k).');
            return;
        }
        const fen = `${placement} ${sideToMove} - - 0 1`;
        setStatus('Analyzing...');
        try {
            const w = await findWorstMove(engine, fen, sideToMove, { perMoveMs: 120, maxMoves: 80 });
            if (w) {
                setResult(`${w.move} (opponent score: ${w.scoreText})`);
                // Optionally apply the move visually if supported by the element
                try {
                    boardRef.current?.move?.(w.move);
                }
                catch { }
            }
            else {
                setResult('No legal moves.');
            }
            setStatus('Done');
        }
        catch (err) {
            setStatus(String(err));
        }
    }
    return (_jsxs("div", { style: { display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%' }, children: [_jsxs("header", { style: { padding: 12, borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("h1", { style: { margin: 0, fontSize: 18 }, children: "Blunder or Gambit" }), _jsxs("div", { style: { display: 'inline-flex', gap: 8, alignItems: 'center' }, children: [_jsx("label", { children: "Side to move:" }), _jsxs("select", { value: sideToMove, onChange: (e) => setSideToMove(e.target.value), children: [_jsx("option", { value: "w", children: "White" }), _jsx("option", { value: "b", children: "Black" })] })] }), _jsx("button", { onClick: onFindWorst, children: "Find worst move" }), _jsx("button", { onClick: clearBoard, children: "Clear" }), _jsx("button", { onClick: startPosition, children: "Start position" }), _jsx("span", { style: { marginLeft: 'auto', color: '#6b7280' }, children: status })] }), _jsxs("main", { style: { display: 'grid', gridTemplateColumns: 'minmax(280px, 560px) 1fr', gap: 16, padding: 16 }, children: [_jsxs("div", { children: [_jsx("chess-board", { ref: boardRef, id: "board", "draggable-pieces": true, "spare-pieces": true, "drop-off-board": "trash", orientation: orientation, style: { width: 'min(90vw, 560px)' } }), _jsxs("p", { style: { marginTop: 12 }, children: [_jsx("strong", { children: "Worst move:" }), " ", result] })] }), _jsx("div", { style: { fontSize: 14, color: '#374151' }, children: _jsx("p", { children: "Drag pieces from the tray onto the board. Drag off to remove. Kings cannot be added from the tray, removed, captured, or replaced." }) })] })] }));
}
