'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CuratorRow {
  id: string;
  name: string;
  selectionCount: number;
}

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

  if (loading) {
    return (
      <div style={{
        background: 'var(--lt-bg)', minHeight: '100vh',
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

  return (
    <div style={{ background: 'var(--lt-bg)', minHeight: '100vh', padding: '48px 32px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--paper-4)', letterSpacing: '0.14em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>
            admin · magazine preview
          </div>
          <div style={{
            height: 1,
            background: 'var(--paper)',
            opacity: 0.8,
            marginBottom: 24,
            boxShadow: '0 0 6px 1px rgba(240,235,226,0.25), 0 0 20px rgba(240,235,226,0.08)',
          }} />
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 40,
            color: 'var(--paper)', margin: 0, lineHeight: 1.1,
          }}>
            {periodName || 'Active Period'}
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300,
            color: 'var(--paper-3)', margin: '10px 0 0',
          }}>
            {curators.length} curator{curators.length !== 1 ? 's' : ''} with creator selections
          </p>
        </div>

        {error && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 12,
            color: 'var(--neon-accent)', marginBottom: 24,
            letterSpacing: '0.06em',
          }}>
            {error}
          </div>
        )}

        {curators.length === 0 ? (
          <p style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 15, color: 'var(--paper-4)',
          }}>
            No curators have selections for this period yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {curators.map(c => (
              <Link key={c.id} href={`/admin/preview/${c.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--ground-2)',
                  border: '1px solid var(--rule)',
                  borderLeft: '2px solid var(--neon-accent)',
                  boxShadow: '-3px 0 10px -2px var(--glow-accent), inset 0 0 0 0 transparent',
                  borderRadius: 3,
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                }}>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-serif)', fontSize: 22,
                      color: 'var(--paper)', lineHeight: 1.2,
                    }}>
                      {c.name}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: 'var(--paper-4)', letterSpacing: '0.1em',
                      marginTop: 5,
                    }}>
                      {c.selectionCount} creator selection{c.selectionCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Press mechanic button */}
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--neon-accent)',
                    border: '1px solid var(--rule-mid)',
                    borderBottom: '2px solid var(--ground-4)',
                    borderRadius: 2,
                    padding: '7px 14px',
                    boxShadow: '0 2px 0 var(--ground-4), 0 3px 6px rgba(0,0,0,0.4)',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    Preview →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
