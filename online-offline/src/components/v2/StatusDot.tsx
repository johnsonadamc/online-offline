import React from 'react';

// Design HTML `.rr .dot`: 7px round — green accepted, --line2 pending,
// orange declined (matches collab_participants.invite_status).

export type InviteStatus = 'accepted' | 'pending' | 'declined';

const color: Record<InviteStatus, string> = {
  accepted: 'var(--green)',
  pending: 'var(--line2)',
  declined: 'var(--orange)',
};

export interface StatusDotProps {
  status: InviteStatus;
  style?: React.CSSProperties;
}

export function StatusDot({ status, style }: StatusDotProps) {
  return (
    <span
      role="img"
      aria-label={status}
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color[status],
        flex: 'none',
        ...style,
      }}
    />
  );
}
