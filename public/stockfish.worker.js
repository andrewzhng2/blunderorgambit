// Minimal wrapper to run Stockfish asm.js as a web worker when the upstream build
// does not register onmessage/postMessage handlers by itself.
importScripts('stockfish.js');

// Some builds expose a function STOCKFISH() that returns a worker-like object.
// Others put a global object called Stockfish with .postMessage & .onmessage.
// We normalize to standard Worker messaging.
var engine = self.STOCKFISH ? self.STOCKFISH() : (self.Stockfish || self.stockfish || null);

if (!engine) {
  // Fallback: attempt to find any global with postMessage
  for (var k in self) {
    if (self[k] && typeof self[k].postMessage === 'function' && typeof self[k].onmessage !== 'undefined') {
      engine = self[k];
      break;
    }
  }
}

if (!engine) {
  self.postMessage('error Failed to initialize Stockfish');
} else {
  self.onmessage = function (e) {
    engine.postMessage(e.data);
  };
  engine.onmessage = function (line) {
    var data = (typeof line === 'string') ? line : (line && line.data);
    if (data != null) self.postMessage(data);
  };
}


