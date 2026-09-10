'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { SERIF, SANS, MONO } from '@/components/v2';

interface PageSlot {
  templateName: string;
  pageCount: number;
  isSpread: boolean;
  slotStart: number;
  html: string;
}

interface PreviewData {
  curatorName: string;
  periodName: string;
  season: string;
  pages: PageSlot[];
}

// Single page: 790×1054, rendered at 50% → 395×527 container
// Spread:     1580×1054, rendered at 50% → 790×527 container
// Design System v2 (Phase 13 light restyle): the chrome (sticky header, slot
// dividers, loading/error) uses the v2 tokens; the iframes, their srcDoc and
// the print-dimension scaling are untouched. The root stays wider than
// PageShell's 560px column because a spread iframe is 790px at 50%.
const SCALE = 0.5;
const PAGE_W = 790;
const SPREAD_W = 1580;
const PAGE_H = 1054;

export default function AdminPreviewPage() {
  const supabase = useSupabase();
  const router = useRouter();
  const params = useParams();
  const curatorId = params.curatorId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<PreviewData | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data: adminRow } = await supabase
        .from('profile_types')
        .select('type')
        .eq('profile_id', user.id)
        .eq('type', 'admin')
        .maybeSingle();
      if (!adminRow) { router.push('/dashboard'); return; }

      const res = await fetch(`/api/admin/preview/${curatorId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? `HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json as PreviewData);
      setLoading(false);
    }
    load();
  }, [curatorId]);

  if (loading) {
    return (
      <div style={{
        background: 'var(--bg)', minHeight: '100dvh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ font: `400 12px/1 ${MONO}`, letterSpacing: '0.14em', color: 'var(--ink3)' }}>
          loading…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'var(--bg)', minHeight: '100dvh', padding: '22px 24px', boxSizing: 'border-box',
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <Link href="/admin" style={{ font: `500 12px/1 ${SANS}`, color: 'var(--ink2)', textDecoration: 'none' }}>
            ‹ Admin
          </Link>
          <p style={{ font: `400 12px/1.4 ${MONO}`, color: 'var(--orange)', marginTop: 32, letterSpacing: '0.04em' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100dvh', paddingBottom: 80, fontFamily: SANS }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--line)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/admin" style={{ font: `500 12px/1 ${SANS}`, color: 'var(--ink2)', textDecoration: 'none', flex: 'none' }}>
            ‹ Admin
          </Link>
          <div style={{ width: 1, height: 16, background: 'var(--line2)' }} />
          <div>
            <span style={{ font: `400 19px/1 ${SERIF}`, color: 'var(--ink)' }}>
              {data.curatorName}
            </span>
            <span style={{ font: `400 11px/1 ${MONO}`, color: 'var(--ink3)', letterSpacing: '0.08em', marginLeft: 12 }}>
              {data.periodName}
            </span>
          </div>
        </div>
        <div style={{ font: `400 11px/1 ${MONO}`, color: 'var(--ink3)', letterSpacing: '0.08em' }}>
          {data.pages.length} page slot{data.pages.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Page slots */}
      <div style={{ padding: '40px 24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        {data.pages.map((slot, idx) => {
          const iframeW = slot.isSpread ? SPREAD_W : PAGE_W;
          const containerW = iframeW * SCALE;
          const containerH = PAGE_H * SCALE;

          const pageLabel = slot.pageCount === 2
            ? `Pages ${slot.slotStart}–${slot.slotStart + 1}`
            : `Page ${slot.slotStart}`;

          return (
            <div key={idx} style={{ width: '100%', maxWidth: 900 }}>

              {/* Divider */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '20px 0 16px',
              }}>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ font: `500 10px/1 ${MONO}`, color: 'var(--ink3)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                    {pageLabel}
                  </span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)' }} />
                  <span style={{ font: `500 10px/1 ${MONO}`, color: 'var(--ink2)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                    {slot.templateName}
                  </span>
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>

              {/* Iframe wrapper — scaled down from print dimensions */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <div style={{
                  width: containerW,
                  height: containerH,
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                  border: '1px solid var(--line)',
                }}>
                  <iframe
                    srcDoc={slot.html}
                    width={iframeW}
                    height={PAGE_H}
                    style={{
                      border: 'none',
                      display: 'block',
                      transformOrigin: 'top left',
                      transform: `scale(${SCALE})`,
                    }}
                    sandbox="allow-scripts"
                    title={`${slot.templateName} — ${pageLabel}`}
                  />
                </div>
              </div>

            </div>
          );
        })}

        {/* End mark */}
        <div style={{ marginTop: 48, display: 'flex', alignItems: 'center', gap: 14, width: '100%', maxWidth: 900 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span style={{ font: `500 10px/1 ${MONO}`, color: 'var(--ink3)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            end of magazine
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

      </div>
    </div>
  );
}
