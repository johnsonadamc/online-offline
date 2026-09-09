'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Accent, accentVar, SANS, tint } from './shared';

// Design HTML `.bitem.swiped .leave`: swipe left reveals an 84px action button
// (18% accent tint, accent text, r8, 11px sans .12em uppercase).
// Fallbacks per README: long-press (touch) and a hover "···" (desktop) open
// the same action. The gesture must not steal vertical scroll (axis lock) or
// the row's own tap (a tap while open only closes the row).

const ACTION_W = 84;
const OPEN_X = -(ACTION_W + 12);
const LONG_PRESS_MS = 500;

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

export function SwipeRow({ action, accent = 'orange', onAction, disabled, children }: SwipeRowProps) {
  const [open, setOpen] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<'h' | 'v' | null>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPress.current) {
      clearTimeout(longPress.current);
      longPress.current = null;
    }
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    axis.current = null;
    clearLongPress();
    longPress.current = setTimeout(() => {
      longPress.current = null;
      suppressClick.current = true;
      setOpen(true);
    }, LONG_PRESS_MS);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (disabled || !start.current) return;
    const t = e.touches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    if (axis.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      clearLongPress();
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
      if (nowOpen || open) suppressClick.current = true;
      setDragX(null);
    }
    start.current = null;
    axis.current = null;
  };

  // A tap on an open row closes it instead of activating the row.
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

  if (disabled) return <div>{children}</div>;

  return (
    <div
      style={{ position: 'relative', overflow: 'hidden' }}
      onMouseEnter={() => setHovered(true)}
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
        }}
      >
        {children}
      </div>

      {/* Desktop fallback: "···" appears on hover, toggles the action. */}
      {hovered && !open && x === 0 && (
        <button
          type="button"
          aria-label={`${action} options`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            borderWidth: 0,
            color: 'var(--ink3)',
            font: `500 16px/1 ${SANS}`,
            letterSpacing: '0.1em',
            padding: '8px 6px',
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
