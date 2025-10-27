export type StockfishSource = 'cdn' | 'local';

// Creates a Worker that loads Stockfish via importScripts and normalizes messaging.
export function createStockfishWorker(source: StockfishSource = 'cdn'): Worker {
  const scriptUrl = source === 'cdn'
    ? 'https://cdn.jsdelivr.net/npm/stockfish@16/stockfish.js'
    : '/stockfish.js';

  const workerCode = `
    (function(){
      try {
        importScripts('${scriptUrl}');
      } catch (e) {
        postMessage('error load:'+ (e && e.message || e));
        return;
      }
      var eng = (typeof self.STOCKFISH === 'function') ? self.STOCKFISH() : (self.Stockfish || self.stockfish);
      if (!eng) { postMessage('error no-engine'); return; }
      onmessage = function(ev){ try { eng.postMessage(ev.data); } catch (e) {} };
      eng.onmessage = function(m){ var d = (typeof m === 'string') ? m : (m && m.data); if (d != null) postMessage(d); };
      postMessage('wrapper ready');
    })();
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}



