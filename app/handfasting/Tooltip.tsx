"use client"
import { useState, cloneElement, useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { useFloating, useInteractions, useHover, FloatingPortal, shift, offset, safePolygon, flip, type Placement } from '@floating-ui/react';

export const Tooltip = ({
  children,
  content,
  placement = "top-start",
  maxWidth = 300,
  interactive = false,
  forceOpen = false,
  deactivate = false,
  styleManually = false,
  accentColor
}: {
  children: ReactElement;
  content: ReactNode;
  placement?: Placement;
  interactive?: boolean;
  maxWidth?: number;
  forceOpen?: boolean;
  deactivate?: boolean;
  styleManually?: boolean;
  accentColor?: string;
}) => {
  const [open, setOpen] = useState(forceOpen ? true : false);
  const [hoverEnabled, setHoverEnabled] = useState(true);
  const lastMousePos = useRef<{x: number, y: number} | null>(null);
  const { refs, floatingStyles, context } = useFloating({
    open: open,
    onOpenChange: forceOpen ? undefined : (newOpen) => {
      if (newOpen && !hoverEnabled) return;
      setOpen(newOpen);
    },
    placement,
    middleware: [
      offset(8),
      flip({
        fallbackPlacements: ['right', 'left-start', 'left', 'bottom-end', 'bottom', 'bottom-start', 'top-end', 'top', 'top-start'],
        fallbackStrategy: 'bestFit',
        padding: 8
      }),
      shift({ padding: 8 })
    ]
  });
  const hover = useHover(context, {
    handleClose: interactive ? safePolygon() : undefined,
    enabled: hoverEnabled
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
  ]);

  useEffect(() => {
    const handleScroll = () => {
      setOpen(false);
      setHoverEnabled(false);
    };
    const handleMouseMove = (e: MouseEvent) => {
      const last = lastMousePos.current;
      if (last && (Math.abs(e.clientX - last.x) > 3 || Math.abs(e.clientY - last.y) > 3)) {
        setHoverEnabled(true);
      }
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('wheel', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const isClient = typeof window !== 'undefined';

  const elementProps = {
    ref: refs.setReference,
    ...getReferenceProps(),
  };

  const color = "#fffff8" //"rgba(240, 233, 211, 0.95)"
  return (
    <>
      {cloneElement(children, elementProps)}
      {open && isClient && !deactivate && <FloatingPortal>
        <div
          ref={refs.setFloating}
          style={{ ...floatingStyles, maxWidth: `min(${maxWidth}px, 90vw)`, backgroundColor: color, boxShadow: '1px 1px 300px 0px rgba(10, 10, 0, 0.1), 1px 1px 3px 0px rgba(0, 0, 0, 0.2)', ...(accentColor ? { borderLeft: `3px solid ${accentColor}` } : {}) }}
          {...getFloatingProps()}
          data-tooltip-surface="true"
          className={!styleManually ? `text-black border border-transparent rounded-sm z-[1000] p-2 text-xs font-mono` : "z-[1000] p-2"}
        >
          {content}
        </div>
      </FloatingPortal>}
    </>
  );
};

export default Tooltip;
