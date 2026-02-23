import React, { useEffect, useState } from 'react';
import type { UserSettings, SessionStats, DailyStats, AllTimeStats } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/constants';

interface Stats {
  session: SessionStats;
  daily: DailyStats;
  allTime: AllTimeStats;
}

export function Popup() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }).then(setSettings);
    chrome.runtime.sendMessage({ type: 'GET_STATS' }).then(setStats);
  }, []);

  const updateMode = (mode: UserSettings['mode']) => {
    const updated = { ...settings, mode };
    setSettings(updated);
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload: { mode } });
  };

  const updateThreshold = (threshold: number) => {
    const updated = { ...settings, threshold };
    setSettings(updated);
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload: { threshold } });
  };

  const s = stats?.session;
  const d = stats?.daily;

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px' }}>🧹</span>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2 }}>Feed Cleaner</h1>
          <p style={{ fontSize: '11px', color: '#6b7280' }}>AI Content Filter</p>
        </div>
      </div>

      {/* Session Stats */}
      <div style={{
        background: '#1a1a2e',
        borderRadius: '10px',
        padding: '12px',
        marginBottom: '12px',
      }}>
        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px', fontWeight: 600 }}>
          THIS SESSION
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <StatCard label="Scanned" value={s?.postsScanned ?? 0} />
          <StatCard label="Filtered" value={s?.postsFiltered ?? 0} color="#ef4444" />
          <StatCard label="Gems Found" value={s?.gemsFound ?? 0} icon="💎" color="#fbbf24" />
          <StatCard label="Feed Score" value={s?.avgFeedScore ?? 0} suffix="/100" color={
            (s?.avgFeedScore ?? 0) >= 70 ? '#10b981' :
            (s?.avgFeedScore ?? 0) >= 50 ? '#f59e0b' : '#ef4444'
          } />
        </div>
        {d && d.estimatedMinutesSaved > 0 && (
          <div style={{
            marginTop: '8px',
            padding: '6px 10px',
            background: '#065f4620',
            border: '1px solid #10b98140',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#6ee7b7',
            textAlign: 'center',
          }}>
            ⏱️ Saved ~{d.estimatedMinutesSaved} min today
          </div>
        )}
      </div>

      {/* Mode Selector */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', fontWeight: 600 }}>
          FILTER MODE
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['highlight', 'dim', 'clean'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => updateMode(mode)}
              style={{
                flex: 1,
                padding: '8px',
                border: `1px solid ${settings.mode === mode ? '#3b82f6' : '#333'}`,
                background: settings.mode === mode ? '#3b82f620' : '#1a1a2e',
                color: settings.mode === mode ? '#60a5fa' : '#9ca3af',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: settings.mode === mode ? 600 : 400,
                transition: 'all 0.2s',
              }}
            >
              {mode === 'highlight' ? '🎨' : mode === 'dim' ? '🔅' : '🧹'}{' '}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '10px', color: '#4b5563', marginTop: '4px' }}>
          {settings.mode === 'highlight' ? 'Color-code posts by quality, hide nothing' :
           settings.mode === 'dim' ? 'Fade low-quality posts, hover to reveal' :
           'Remove low-quality posts from your feed'}
        </p>
      </div>

      {/* Threshold Slider */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>QUALITY THRESHOLD</span>
          <span style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>{settings.threshold}</span>
        </div>
        <input
          type="range"
          min="0"
          max="80"
          value={settings.threshold}
          onChange={(e) => updateThreshold(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#3b82f6' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#4b5563' }}>
          <span>Show all</span>
          <span>Strict</span>
        </div>
      </div>

      {/* Detection Toggles */}
      <div style={{
        background: '#1a1a2e',
        borderRadius: '10px',
        padding: '10px 12px',
        marginBottom: '12px',
      }}>
        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', fontWeight: 600 }}>
          DETECT
        </div>
        <Toggle label="🤖 AI Content" checked={settings.enableAiDetection}
          onChange={() => chrome.runtime.sendMessage({
            type: 'UPDATE_SETTINGS', payload: { enableAiDetection: !settings.enableAiDetection }
          }).then(s => setSettings(s))} />
        <Toggle label="🎣 Engagement Bait" checked={settings.enableBaitDetection}
          onChange={() => chrome.runtime.sendMessage({
            type: 'UPDATE_SETTINGS', payload: { enableBaitDetection: !settings.enableBaitDetection }
          }).then(s => setSettings(s))} />
        <Toggle label="🤖 Bot/Farm" checked={settings.enableBotDetection}
          onChange={() => chrome.runtime.sendMessage({
            type: 'UPDATE_SETTINGS', payload: { enableBotDetection: !settings.enableBotDetection }
          }).then(s => setSettings(s))} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') })}
          style={{
            flex: 1,
            padding: '10px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => {
            const score = stats?.session.avgFeedScore ?? 0;
            const text = `My X feed health score: ${score}/100 🧹\n\nFeed Cleaner filtered ${stats?.session.postsFiltered ?? 0} low-quality posts today and found ${stats?.session.gemsFound ?? 0} gems 💎`;
            navigator.clipboard.writeText(text);
          }}
          style={{
            flex: 1,
            padding: '10px',
            background: '#1a1a2e',
            color: '#9ca3af',
            border: '1px solid #333',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          📋 Share Score
        </button>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '10px', color: '#374151' }}>
        Feed Cleaner v1.0.0 · All analysis runs locally · Zero data collected
      </div>
    </div>
  );
}

// ── Components ────────────────────────────────────────────────

function StatCard({ label, value, icon, suffix, color }: {
  label: string; value: number; icon?: string; suffix?: string; color?: string;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: 700, color: color || '#e7e9ea', lineHeight: 1.2 }}>
        {icon && <span style={{ fontSize: '14px' }}>{icon} </span>}
        {value.toLocaleString()}{suffix || ''}
      </div>
      <div style={{ fontSize: '10px', color: '#6b7280' }}>{label}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        cursor: 'pointer',
        fontSize: '13px',
      }}
    >
      <span>{label}</span>
      <div style={{
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        background: checked ? '#3b82f6' : '#374151',
        position: 'relative',
        transition: 'background 0.2s',
      }}>
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: 'white',
          position: 'absolute',
          top: '2px',
          left: checked ? '18px' : '2px',
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  );
}
