'use client';

import React, { useRef, useState } from 'react';
import { Accent, accentVar, MONO, SANS, SERIF } from './shared';

// Design HTML `.prev`: image frame, 10px radius, 1px --line2 border.
// Crosshair 44px (1px accent lines + 16px ring at inset 14px, 40% dark fill)
// at focal_x/focal_y percent. Drag or tap sets it; "CROP CENTER x%, y%" mono
// label bottom-left; optional "★ Feature" bottom-right and × top-right slots.
// Empty state: dashed --bg2 frame with one italic serif line.

const clampPct = (v: number) => Math.round(Math.max(0, Math.min(100, v)));

export interface FocalPointFrameProps {
  /** Image URL. Omit for the empty state. */
  src?: string;
  alt?: string;
  /** Frame proportion. Default '4:3'; collab submit uses '1:1'. */
  aspect?: '4:3' | '1:1';
  /** Focal point, 0–100 (content_entries.focal_x/focal_y). Default 50/50. */
  focalX?: number;
  focalY?: number;
  /** Fires live while dragging and on tap, with integer percents. */
  onFocalChange?: (x: number, y: number) => void;
  /** Crosshair + label color. Default orange; collab submit uses mode color. */
  accent?: Accent;
  /** Render the ★ Feature slot (collection mode). */
  showFeature?: boolean;
  isFeature?: boolean;
  onToggleFeature?: () => void;
  /** Render the × remove slot. */
  onRemove?: () => void;
  /** Empty-state line. Default "Add an image". */
  emptyLabel?: string;
  /** Tap handler for the empty state (open the file picker). */
  onEmptyPress?: () => void;
  style?: React.CSSProperties;
}

export function FocalPointFrame({
  src,
  alt = '',
  aspect = '4:3',
  focalX = 50,
  focalY = 50,
  onFocalChange,
  accent = 'orange',
  showFeature,
  isFeature,
  onToggleFeature,
  onRemove,
  emptyLabel = 'Add an image',
  onEmptyPress,
  style,
}: FocalPointFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const aspectRatio = aspect === '1:1' ? '1 / 1' : '4 / 3';
  const a = accentVar(accent);

  if (!src) {
    return (
      <button
        type="button"
        onClick={onEmptyPress}
        style={{
          display: 'grid',
          placeItems: 'center',
          width: '100%',
          aspectRatio,
          borderRadius: 10,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: 'var(--line2)',
          background: 'var(--bg2)',
          cursor: onEmptyPress ? 'pointer' : 'default',
          WebkitTapHighlightColor: 'transparent',
          ...style,
        }}
      >
        <span style={{ font: `italic 400 15px/1 ${SERIF}`, color: 'var(--ink3)' }}>
          {emptyLabel}
        </span>
      </button>
    );
  }

  const setFromPointer = (clientX: number, clientY: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || !onFocalChange) return;
    onFocalChange(
      clampPct(((clientX - rect.left) / rect.width) * 100),
      clampPct(((clientY - rect.top) / rect.height) * 100)
    );
  };

  return (
    <div
      ref={frameRef}
      onPointerDown={(e) => {
        if (!onFocalChange) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        setFromPointer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (dragging) setFromPointer(e.clientX, e.clientY);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'var(--line2)',
        overflow: 'hidden',
        touchAction: 'none',
        cursor: onFocalChange ? 'crosshair' : 'default',
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          userSelect: 'none',
        }}
      />

      {/* Crosshair */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: `${focalX}%`,
          top: `${focalY}%`,
          width: 44,
          height: 44,
          margin: '-22px 0 0 -22px',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: 1,
            background: a,
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 1,
            background: a,
          }}
        />
        <i
          style={{
            position: 'absolute',
            inset: 14,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: a,
            borderRadius: '50%',
            background: 'rgba(13,12,10,0.4)',
          }}
        />
      </span>

      {/* Live crop label */}
      <span
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          font: `400 10px/1 ${MONO}`,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: a,
          pointerEvents: 'none',
        }}
      >
        Crop center {clampPct(focalX)}%, {clampPct(focalY)}%
      </span>

      {showFeature && (
        <button
          type="button"
          aria-pressed={isFeature}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFeature?.();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: 12,
            bottom: 10,
            font: `500 10.5px/1 ${SANS}`,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: isFeature ? a : 'var(--ink2)',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: isFeature ? a : 'var(--line2)',
            padding: '8px 10px',
            borderRadius: 5,
            background: 'rgba(13,12,10,0.6)',
            cursor: 'pointer',
          }}
        >
          ★ Feature
        </button>
      )}

      {onRemove && (
        <button
          type="button"
          aria-label="Remove image"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            width: 26,
            height: 26,
            borderRadius: '50%',
            borderWidth: 0,
            background: 'rgba(13,12,10,0.7)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink2)',
            font: `300 16px/1 ${SANS}`,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
