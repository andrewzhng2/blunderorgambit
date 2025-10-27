import { forwardRef, useEffect, useRef } from 'react';
import 'chessboard-element';
import type { ChessBoardElement } from '../types/chessboard-element';

type Props = React.ComponentPropsWithoutRef<'chess-board'> & {
  hideKingsInSpare?: boolean;
};

const ChessBoardElement = forwardRef<ChessBoardElement, Props>(function ChessBoardElement(
  { hideKingsInSpare = true, ...props },
  ref
) {
  const innerRef = useRef<ChessBoardElement | null>(null);

  useEffect(() => {
    const el = innerRef.current as any;
    if (!el || !el.shadowRoot) return;
    if (!hideKingsInSpare) return;
    const filterKings = () => {
      try {
        const sr: ShadowRoot = el.shadowRoot;
        const list = sr.querySelectorAll('[id^="spare-"]');
        list.forEach((n) => {
          const id = (n as HTMLElement).id;
          if (id === 'spare-wK' || id === 'spare-bK') {
            (n as HTMLElement).style.display = 'none';
          }
        });
      } catch {}
    };
    filterKings();
    const obs = new MutationObserver(() => filterKings());
    obs.observe(el.shadowRoot, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [hideKingsInSpare]);

  return (
    <chess-board ref={((node: any) => {
      innerRef.current = node as ChessBoardElement;
      if (typeof ref === 'function') ref(node as ChessBoardElement);
      else if (ref && typeof ref === 'object') (ref as any).current = node as ChessBoardElement;
    }) as any} {...props} />
  );
});

export default ChessBoardElement;



