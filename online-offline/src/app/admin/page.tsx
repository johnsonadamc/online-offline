'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageShell, SectionLabel, SERIF, SANS, MONO } from '@/components/v2';

interface CuratorRow {
  id: string;
  name: string;
  selectionCount: number;
}

// Design System v2 (Phase 13 light restyle): ink-only header, one row per
// curator (serif name, mono count), quiet outlined "Preview" button. The data
// flow below is unchanged.
const Wordmark = () => (
  <div style={{ font: `400 19px/1 ${SERIF}`, color: 'var(--ink)' }}>
    online<span style={{ color: 'var(--ink3)' }}>{'//'}</span>offline
  </div>
);

export default function AdminPage() {
  const supabase = useSupabase();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [curators, setCurators] = useState<CuratorRow[]>([]);
  const [periodName, setPeriodName] = useState('');
  const [error, setError] = useState('');

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

      const { data: period } = await supabase
        .from('periods')
        .select('id, name')
        .eq('is_active', true)
        .maybeSingle();
      if (!period) { setLoading(false); return; }
      setPeriodName((period as { name: string }).name);

      const { data: selections, error: selErr } = await supabase
        .from('curator_creator_selections')
        .select('curator_id')
        .eq('period_id', (period as { id: string }).id);
      if (selErr) { setError(selErr.message); setLoading(false); return; }

      const rawSelections = (selections ?? []) as Array<{ curator_id: string }>;
      const curatorIds = [...new Set(rawSelections.map(s => s.curator_id))];

      if (curatorIds.length === 0) { setLoading(false); return; }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', curatorIds);

      const countMap: Record<string, number> = {};
      for (const s of rawSelections) {
        countMap[s.curator_id] = (countMap[s.curator_id] ?? 0) + 1;
      }

      const rows: CuratorRow[] = ((profiles ?? []) as Array<{ id: string; first_name?: string; last_name?: string }>)
        .map(p => ({
          id: p.id,
          name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown',
          selectionCount: countMap[p.id] ?? 0,
        }))
        .sort((a, b) => b.selectionCount - a.selectionCount);

      setCurators(rows);
      setLoading(false);
    }
    load();
  }, []);

  const header = (
    <>
      <Link href="/dashboard" style={{ font: `500 12px/1 ${SANS}`, color: 'var(--ink2)', textDecoration: 'none', flex: 'none' }}>‹ Dashboard</Link>
      <Wordmark />
      <span style={{ font: `500 12px/1 ${SANS}`, color: 'var(--ink2)', flex: 'none' }}>Admin</span>
    </>
  );

  if (loading) {
    return (
      <PageShell header={header}>
        <div style={{ paddingTop: 26, font: `400 12px/1 ${MONO}`, letterSpacing: '0.14em', color: 'var(--ink3)', textAlign: 'center' }}>loading…</div>
      </PageShell>
    );
  }

  return (
    <PageShell header={header} columnStyle={{ paddingBottom: 48 }}>
      {/* Title block */}
      <div style={{ padding: '28px 0 22px', borderBottom: '1px solid var(--line)' }}>
        <SectionLabel>magazine preview</SectionLabel>
        <h1 style={{ font: `400 32px/1.1 ${SERIF}`, color: 'var(--ink)', margin: '12px 0 0' }}>
          {periodName || 'Active Period'}
        </h1>
        <p style={{ font: `400 13.5px/1.4 ${SANS}`, color: 'var(--ink2)', margin: '8px 0 0' }}>
          {curators.length} curator{curators.length !== 1 ? 's' : ''} with creator selections
        </p>
      </div>

      {error && (
        <p style={{ font: `400 12px/1.4 ${MONO}`, color: 'var(--orange)', letterSpacing: '0.04em', margin: '18px 0 0' }}>
          {error}
        </p>
      )}

      {curators.length === 0 ? (
        <div style={{ font: `italic 400 15px/1.4 ${SERIF}`, color: 'var(--ink3)', textAlign: 'center', padding: '26px 0 0' }}>
          No curators have selections for this period yet.
        </div>
      ) : (
        <div>
          {curators.map(c => (
            <Link
              key={c.id}
              href={`/admin/preview/${c.id}`}
              style={{
                textDecoration: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                padding: '18px 0',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ font: `400 21px/1.2 ${SERIF}`, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </div>
                <div style={{ font: `400 11px/1 ${MONO}`, color: 'var(--ink3)', letterSpacing: '0.08em', marginTop: 6 }}>
                  {c.selectionCount} creator selection{c.selectionCount !== 1 ? 's' : ''}
                </div>
              </div>

              <span style={{
                font: `500 12px/1 ${SANS}`, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--ink2)', padding: '11px 14px', borderRadius: 5,
                border: '1px solid var(--line2)', flex: 'none', whiteSpace: 'nowrap',
              }}>
                Preview
              </span>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
