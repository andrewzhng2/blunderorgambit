# Blunder or Gambit

Single-page React + Vite + TypeScript app that lets you set up any position and asks Stockfish: “what’s the worst move I can play right now?” Runs fully in-browser using the asm.js build of Stockfish (no backend).

## Getting started

1. Install dependencies (also copies the engine into `public/stockfish.js`):

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

Open the printed local URL. The board starts from the initial position.

## How it works

- Board UI is the `chessboard-element` web component with spare pieces enabled and drop-off-board set to trash.
- You can drag unlimited Q/R/B/N/P from the tray; drag off the board to remove.
- The app validates that exactly one white king (K) and one black king (k) are on the board before analysis.
- When you click “Find worst move”, the app:
  - Sends the current FEN and uses Stockfish’s `d` command to get legal moves.
  - For each move, runs a short search (`go movetime 120`) and interprets the final score from the last `info` line.
  - Chooses the move that maximizes the opponent’s advantage.

## Forcing asm.js

To avoid COOP/COEP headers required by threaded WebAssembly, this app uses the asm.js build of Stockfish. During install, `scripts/copy-stockfish.mjs` copies the asm.js file shipped in the `stockfish` package to `public/stockfish.js`. If that path ever changes, adjust the script accordingly.

## Build

```bash
npm run build
```

This produces a static site in `dist/` that you can deploy to any static host (GitHub Pages, Netlify, Vercel, etc.).

