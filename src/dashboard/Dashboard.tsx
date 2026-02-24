import React, { useEffect, useState } from 'react';
import type { SessionStats, DailyStats, AllTimeStats, Category } from '../shared/types';
import { CATEGORY_META } from '../shared/types';
import { ALL_CATEGORIES } from '../shared/constants';

interface Stats {
  session: SessionStats;
  daily: DailyStats;
  allTime: AllTimeStats;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }).then(setStats);
  }, []);

  const s = stats?.session;
  const d = stats?.daily;
  const a = stats?.allTime;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <span style={{ fontSize: '36px' }}>🧹</span>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Feed Cleaner Dashboard</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Your feed, analyzed and quantified</p>
        </div>
      </div>

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <BigStatCard label="Scanned Today" value={d?.postsScanned ?? 0} />
        <BigStatCard label="Filtered" value={d?.postsFiltered ?? 0} color="#ef4444" />
        <BigStatCard label="Minutes Saved" value={d?.estimatedMinutesSaved ?? 0} icon="⏱️" color="#10b981" />
        <BigStatCard label="Total All-Time" value={a?.totalPostsScanned ?? 0} color="#60a5fa" />
      </div>

      {/* Category Breakdown */}
      <div style={{
        background: '#1a1a2e',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '16px', marginBottom: '16px', marginTop: 0 }}>Detection Breakdown</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {ALL_CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat];
            const count = s?.postsByCategory?.[cat] ?? 0;
            return (
              <div key={cat} style={{
                textAlign: 'center',
                padding: '16px',
                borderRadius: '10px',
                background: `${meta.bgColor}60`,
                border: `1px solid ${meta.borderColor}40`,
              }}>
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{meta.emoji}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: meta.color }}>{count}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{meta.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <div style={{
        background: '#1a1a2e',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <h2 style={{ fontSize: '16px', marginBottom: '12px', marginTop: 0 }}>How It Works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: '#9ca3af' }}>
          <div>
            <strong style={{ color: '#e7e9ea' }}>🏷️ Ads</strong>
            <p style={{ margin: '4px 0 0' }}>Detected via X's own DOM markers. Near 100% accuracy.</p>
          </div>
          <div>
            <strong style={{ color: '#e7e9ea' }}>🤖 AI Content</strong>
            <p style={{ margin: '4px 0 0' }}>Structural patterns: emoji lists, numbered threads, AI vocabulary clusters.</p>
          </div>
          <div>
            <strong style={{ color: '#e7e9ea' }}>🎣 Engagement Bait</strong>
            <p style={{ margin: '4px 0 0' }}>Rage bait, reply farming, clickbait hooks, self-promotion CTAs.</p>
          </div>
          <div>
            <strong style={{ color: '#e7e9ea' }}>🤖 Bot/Farm</strong>
            <p style={{ margin: '4px 0 0' }}>Auto-generated handles, crypto spam, template tweets.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', color: '#374151' }}>
        🔒 All data stays in your browser · Zero tracking · Zero data collection
      </div>
    </div>
  );
}

function BigStatCard({ label, value, suffix, icon, color }: {
  label: string; value: number; suffix?: string; icon?: string; color?: string;
}) {
  return (
    <div style={{
      background: '#1a1a2e',
      borderRadius: '12px',
      padding: '16px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '28px', fontWeight: 700, color: color || '#e7e9ea' }}>
        {icon && <span style={{ fontSize: '20px' }}>{icon} </span>}
        {value.toLocaleString()}{suffix || ''}
      </div>
      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{label}</div>
    </div>
  );
}
