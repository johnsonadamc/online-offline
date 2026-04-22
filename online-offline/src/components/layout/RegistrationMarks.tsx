'use client';

import { usePathname } from 'next/navigation';

function RegSvg() {
  return (
    <svg viewBox="-9 -9 18 18" overflow="visible" aria-hidden="true">
      <circle className="reg-c" cx="0" cy="0" r="4" />
      <line className="reg-l" x1="-8" y1="0" x2="8" y2="0" />
      <line className="reg-l" x1="0" y1="-8" x2="0" y2="8" />
    </svg>
  );
}

export default function RegistrationMarks() {
  const pathname = usePathname();
  const isCurate = pathname === '/curate';
  const cls = `reg-mark${isCurate ? ' curate' : ''}`;

  return (
    <>
      <div className={`${cls} reg-mark-bl`}><RegSvg /></div>
      <div className={`${cls} reg-mark-br`}><RegSvg /></div>
    </>
  );
}
