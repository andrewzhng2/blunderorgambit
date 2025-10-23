export interface ChessBoardElement extends HTMLElement {
  fen: () => string | false;
  move: (...moves: Array<string | false>) => any;
  start: (useAnimation?: boolean) => void;
  clear: (useAnimation?: boolean) => void;
  setPosition: (position: string | Record<string, string>, useAnimation?: boolean) => void;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'chess-board': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        id?: string;
        orientation?: 'white' | 'black';
        'draggable-pieces'?: boolean;
        'spare-pieces'?: boolean;
        'drop-off-board'?: 'trash' | 'snapback';
        style?: React.CSSProperties;
      };
    }
  }
}


