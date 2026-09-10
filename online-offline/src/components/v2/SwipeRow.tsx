'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Accent, accentVar, SANS, tint } from './shared';

// Design HTML `.bitem.swiped .leave`: swipe left reveals an 84px action button
// (18% accent tint, accent text, r8, 11px sans .12em uppercase).
//
// Input rules (README "SwipeRow"):
// - TOUCH: swipe-left opens the action; long-press (500ms, cancelled by >8px of
//   movement) opens it too and never fires the row's tap on release. A tap on a
//   row at rest (translateX 0) ALWAYS reaches the row's own onClick. Only a row
//   that is swiped open consumes a tap, to close itself.
// - HOVER-CAPABLE devices only ((hover: hover) and (pointer: fine)): a "···"
//   button appears on hover in its OWN reserved 32px right column (the row
//   content gets that much right padding), so it can never sit over the
//   consumer's right slot. Clicking it opens the same action inline and stops
//   propagation. It never renders on touch devices, where :hover sticks after a
//   tap. Showing "···" never puts the row in the open state.

const ACTION_W = 84;
const OPEN_X = -(ACTION_W + 12);
const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 8;
const HOVER_COL_W = 32;

export interface SwipeRowProps {
  /** Action button text, e.g. "Leave", "Withdraw", "Delete". */
  action: string;
  /** Action color. Default orange. */
  accent?: Accent;
  /** Fires on action tap; run the existing confirm dialog in the caller. */
  onAction: () => void;
  /** Disables the gesture and fallbacks; renders children as-is. */
  disabled?: boolean;
  children: React.ReactNode;
}

/** True only on devices that can really hover (mouse/trackpad), false on touch and during SSR. */
function useHoverCapable(): boolean {
  const [capable, setCapable] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCapable(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return capable;
}

export function SwipeRow({ action, accent = 'orange', onAction, disabled, children }: SwipeRowProps) {
  const hoverCapable = useHoverCapable();
  const [open, setOpen] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<'h' | 'v' | null>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set only when a gesture (swipe / long-press) already handled this touch, so the
  // click the browser synthesizes afterwards must not reach the row. Reset on every
  // new touch and auto-cleared, so a stale flag can never eat a later tap.
  const suppressClick = useRef(false);
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPress.current) {
      clearTimeout(longPress.current);
      longPress.current = null;
    }
  }, []);

  const armSuppress = useCallback(() => {
    suppressClick.current = true;
    if (suppressTimer.current) clearTimeout(suppressTimer.current);
    suppressTimer.current = setTimeout(() => {
      suppressClick.current = false;
      suppressTimer.current = null;
    }, 400);
  }, []);

  useEffect(() => () => {
    clearLongPress();
    if (suppressTimer.current) clearTimeout(suppressTimer.current);
  }, [clearLongPress]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    axis.current = null;
    suppressClick.current = false; // a new gesture starts clean
    clearLongPress();
    longPress.current = setTimeout(() => {
      longPress.current = null;
      armSuppress(); // the release after a long-press is not a tap
      setOpen(true);
    }, LONG_PRESS_MS);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (disabled || !start.current) return;
    const t = e.touches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    if (axis.current === null && (Math.abs(dx) > MOVE_TOLERANCE || Math.abs(dy) > MOVE_TOLERANCE)) {
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      clearLongPress(); // any real movement cancels the long-press
    }
    if (axis.current !== 'h') return; // vertical scroll keeps working untouched
    const base = open ? OPEN_X : 0;
    setDragX(Math.max(OPEN_X - 20, Math.min(0, base + dx)));
  };

  const onTouchEnd = () => {
    clearLongPress();
    if (dragX !== null) {
      const nowOpen = dragX < OPEN_X / 2;
      setOpen(nowOpen);
      if (nowOpen || open) armSuppress(); // a swipe that opened/closed is not a tap
      setDragX(null);
    }
    start.current = null;
    axis.current = null;
  };

  // Tap semantics: a row at rest lets the click through to the consumer's onClick.
  // A row that is swiped open consumes the tap to close itself. A click that trails
  // a swipe/long-press is swallowed.
  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  const x = dragX !== null ? dragX : open ? OPEN_X : 0;
  const showHoverAffordance = hoverCapable && hovered && !open && dragX === null;

  if (disabled) return <div>{children}</div>;

  return (
    <div
      style={{ position: 'relative', overflow: 'hidden' }}
      onMouseEnter={() => hoverCapable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onClickCapture={onClickCapture}
        style={{
          transform: `translateX(${x}px)`,
          transition: dragX !== null ? 'none' : 'transform 200ms ease-out',
          // Reserved "···" column on hover-capable devices only; nothing on touch.
          paddingRight: hoverCapable ? HOVER_COL_W : 0,
          boxSizing: 'border-box',
          WebkitTouchCallout: 'none', // no iOS callout on long-press
        }}
      >
        {children}
      </div>

      {/* Desktop fallback: "···" in its own right column; opens the action inline. */}
      {showHoverAffordance && (
        <button
          type="button"
          aria-label={`${action} options`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation(); // never the row's navigation
            setOpen(true);
          }}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: HOVER_COL_W,
            background: 'transparent',
            borderWidth: 0,
            padding: 0,
            color: 'var(--ink3)',
            font: `500 16px/1 ${SANS}`,
            letterSpacing: '0.1em',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          ···
        </button>
      )}

      {(open || dragX !== null) && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
            onAction();
          }}
          style={{
            position: 'absolute',
            right: 0,
            top: 6,
            bottom: 6,
            width: ACTION_W,
            borderRadius: 8,
            borderWidth: 0,
            background: tint(accent, 18),
            color: accentVar(accent),
            display: 'grid',
            placeItems: 'center',
            font: `500 11px/1 ${SANS}`,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
}
