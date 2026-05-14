'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

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
        background: 'var(--ground)', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 13,
          color: 'var(--paper-4)', letterSpacing: '0.08em',
        }}>
          loading…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'var(--ground)', minHeight: '100vh', padding: '48px 32px',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Link href="/admin" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper-4)', letterSpacing: '0.12em', textDecoration: 'none', textTransform: 'uppercase' }}>
            ← back
          </Link>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--neon-accent)', marginTop: 32, letterSpacing: '0.06em' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ background: 'var(--ground)', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--ground)',
        borderBottom: '1px solid var(--rule)',
        padding: '14px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/admin" style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--paper-4)', letterSpacing: '0.14em',
            textDecoration: 'none', textTransform: 'uppercase',
          }}>
            ← admin
          </Link>
          <div style={{ width: 1, height: 16, background: 'var(--rule-mid)' }} />
          <div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--paper)' }}>
              {data.curatorName}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--paper-4)', letterSpacing: '0.1em',
              marginLeft: 12,
            }}>
              {data.periodName}
            </span>
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--paper-4)', letterSpacing: '0.1em',
        }}>
          {data.pages.length} page slot{data.pages.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Page slots */}
      <div style={{ padding: '40px 32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
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
                <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    color: 'var(--paper-4)', letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}>
                    {pageLabel}
                  </span>
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--neon-accent)' }} />
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    color: 'var(--neon-accent)', letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}>
                    {slot.templateName}
                  </span>
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
              </div>

              {/* Iframe wrapper — scaled down from print dimensions */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <div style={{
                  width: containerW,
                  height: containerH,
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                  border: '1px solid var(--rule)',
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
          <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--paper-5)', letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}>
            end of magazine
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
        </div>

      </div>
    </div>
  );
}
