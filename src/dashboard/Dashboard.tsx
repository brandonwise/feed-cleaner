import React, { useEffect, useState } from 'react';
import type { SessionStats, DailyStats, AllTimeStats, AccountProfile, UserSettings } from '../shared/types';

export function Dashboard() {
  const [stats, setStats] = useState<{ session: SessionStats; daily: DailyStats; allTime: AllTimeStats } | null>(null);
  const [accounts, setAccounts] = useState<AccountProfile[]>([]);
  const [tab, setTab] = useState<'overview' | 'accounts' | 'history'>('overview');

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }).then(setStats);
    chrome.runtime.sendMessage({ type: 'GET_ACCOUNTS', payload: { limit: 50 } }).then(setAccounts);
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
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Feed Cleaner Dashboard</h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Your feed, analyzed and quantified</p>
        </div>
      </div>

      {/* Tab Nav */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid #1f2937', paddingBottom: '8px' }}>
        {(['overview', 'accounts', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              background: tab === t ? '#1e293b' : 'transparent',
              color: tab === t ? '#60a5fa' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t === 'overview' ? '📊 Overview' : t === 'accounts' ? '👤 Account Audit' : '📜 History'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          {/* Hero Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <BigStatCard label="Feed Health Score" value={s?.avgFeedScore ?? 0} suffix="/100"
              color={(s?.avgFeedScore ?? 0) >= 70 ? '#10b981' : (s?.avgFeedScore ?? 0) >= 50 ? '#f59e0b' : '#ef4444'} />
            <BigStatCard label="Posts Scanned Today" value={d?.postsScanned ?? 0} />
            <BigStatCard label="Posts Filtered" value={d?.postsFiltered ?? 0} color="#ef4444" />
            <BigStatCard label="Minutes Saved" value={d?.estimatedMinutesSaved ?? 0} icon="⏱️" color="#10b981" />
          </div>

          {/* Gems */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            border: '1px solid #fbbf2430',
          }}>
            <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>💎 Gems Found Today: {d?.gemsFound ?? 0}</h2>
            <p style={{ color: '#9ca3af', fontSize: '13px' }}>
              Gems are posts scoring 85+ — genuine, valuable content worth your time.
            </p>
          </div>

          {/* All-Time Stats */}
          {a && (
            <div style={{
              background: '#1a1a2e',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h2 style={{ fontSize: '16px', marginBottom: '12px', color: '#9ca3af' }}>📈 All Time</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <SmallStat label="Total Scanned" value={a.totalPostsScanned} />
                <SmallStat label="Total Filtered" value={a.totalPostsFiltered} />
                <SmallStat label="Total Gems" value={a.totalGemsFound} />
              </div>
              <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '12px' }}>
                Installed {new Date(a.installDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'accounts' && (
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Account Quality Audit</h2>

          {accounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p style={{ fontSize: '48px', marginBottom: '8px' }}>👀</p>
              <p>No accounts analyzed yet. Browse your feed to start building profiles.</p>
            </div>
          ) : (
            <>
              {/* Worst Follows */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', color: '#ef4444', marginBottom: '8px' }}>
                  🔴 Lowest Quality Follows
                </h3>
                <AccountTable accounts={[...accounts].sort((a, b) => a.avgScore - b.avgScore).slice(0, 10)} />
              </div>

              {/* Best Follows */}
              <div>
                <h3 style={{ fontSize: '14px', color: '#10b981', marginBottom: '8px' }}>
                  🟢 Highest Quality Follows
                </h3>
                <AccountTable accounts={[...accounts].sort((a, b) => b.avgScore - a.avgScore).slice(0, 10)} />
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p style={{ fontSize: '48px', marginBottom: '8px' }}>🔜</p>
          <p>Detailed history coming in v1.1</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>Track quality trends over weeks and months</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', color: '#374151' }}>
        🔒 All data stays in your browser · Zero tracking · Zero data collection
      </div>
    </div>
  );
}

// ── Components ──────────────────────────────────────────────

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

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: 600 }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: '11px', color: '#6b7280' }}>{label}</div>
    </div>
  );
}

function AccountTable({ accounts }: { accounts: AccountProfile[] }) {
  return (
    <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #1f2937' }}>
      {accounts.map((acc, i) => (
        <div key={acc.handle} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: i % 2 === 0 ? '#111827' : '#0f172a',
          fontSize: '13px',
        }}>
          <div>
            <span style={{ fontWeight: 600 }}>@{acc.handle}</span>
            <span style={{ color: '#6b7280', marginLeft: '8px', fontSize: '11px' }}>
              {acc.postsAnalyzed} posts analyzed
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>AI: {acc.avgAiScore}</span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Bait: {acc.avgBaitScore}</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '12px',
              background: acc.avgScore >= 70 ? '#065f4640' : acc.avgScore >= 50 ? '#78350f40' : '#7f1d1d40',
              color: acc.avgScore >= 70 ? '#6ee7b7' : acc.avgScore >= 50 ? '#fcd34d' : '#fca5a5',
            }}>
              {acc.avgScore}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
