import React, { useEffect, useState } from 'react';
import type { UserSettings, SessionStats, DailyStats, AllTimeStats, Category, FilterAction } from '../shared/types';
import { DEFAULT_SETTINGS, ALL_CATEGORIES } from '../shared/constants';
import { CATEGORY_META } from '../shared/types';

interface Stats {
  session: SessionStats;
  daily: DailyStats;
  allTime: AllTimeStats;
}

const ACTION_LABELS: Record<FilterAction, string> = {
  show: 'Show',
  dim: 'Dim',
  hide: 'Hide',
};

const ACTION_CYCLE: FilterAction[] = ['show', 'dim', 'hide'];

export function Popup() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }).then(setSettings);
    chrome.runtime.sendMessage({ type: 'GET_STATS' }).then(setStats);
  }, []);

  const cycleAction = (cat: Category) => {
    const current = settings.filters[cat];
    const idx = ACTION_CYCLE.indexOf(current);
    const next = ACTION_CYCLE[(idx + 1) % ACTION_CYCLE.length];
    const filters = { ...settings.filters, [cat]: next };
    const updated = { ...settings, filters };
    setSettings(updated);
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload: { filters } });
  };

  const s = stats?.session;

  return (
    <div style={{ padding: '16px', minWidth: '320px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px' }}>🧹</span>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2, margin: 0 }}>Feed Cleaner</h1>
          <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Filter the noise from your feed</p>
        </div>
      </div>

      {/* Session Stats */}
      <div style={{
        background: '#1a1a2e',
        borderRadius: '10px',
        padding: '12px',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>THIS SESSION</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#e7e9ea' }}>
            {s?.postsScanned ?? 0} <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 400 }}>scanned</span>
          </span>
        </div>

        {/* Category breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {ALL_CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat];
            const count = s?.postsByCategory?.[cat] ?? 0;
            if (count === 0 && cat === 'lowEffort') return null; // hide low effort if nothing flagged
            return (
              <div key={cat} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '3px 8px',
                borderRadius: '6px',
                background: count > 0 ? `${meta.bgColor}80` : 'transparent',
              }}>
                <span style={{ fontSize: '12px', color: count > 0 ? meta.color : '#4b5563' }}>
                  {meta.emoji} {meta.label}
                </span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: count > 0 ? meta.color : '#374151',
                }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Hidden / dimmed summary */}
        {(s && (s.postsFiltered > 0 || s.postsDimmed > 0)) && (
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
            🛡️ {s.postsFiltered} hidden · {s.postsDimmed} dimmed
          </div>
        )}
      </div>

      {/* Filter Rules */}
      <div style={{
        background: '#1a1a2e',
        borderRadius: '10px',
        padding: '10px 12px',
        marginBottom: '12px',
      }}>
        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px', fontWeight: 600 }}>
          FILTER RULES
        </div>
        {ALL_CATEGORIES.map(cat => {
          const meta = CATEGORY_META[cat];
          const action = settings.filters[cat];
          return (
            <div
              key={cat}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
              }}
            >
              <span style={{ fontSize: '13px' }}>
                {meta.emoji} {meta.label}
              </span>
              <button
                onClick={() => cycleAction(cat)}
                style={{
                  padding: '3px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${
                    action === 'hide' ? '#ef4444' :
                    action === 'dim' ? '#f59e0b' :
                    '#374151'
                  }`,
                  background: action === 'hide' ? '#7f1d1d40' :
                              action === 'dim' ? '#78350f40' :
                              '#1f293780',
                  color: action === 'hide' ? '#fca5a5' :
                         action === 'dim' ? '#fcd34d' :
                         '#6b7280',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  minWidth: '50px',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {ACTION_LABELS[action]}
              </button>
            </div>
          );
        })}
        <p style={{ fontSize: '10px', color: '#374151', marginTop: '6px', marginBottom: 0 }}>
          Click to cycle: Show → Dim → Hide
        </p>
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
            const total = s?.postsFiltered ?? 0;
            const scanned = s?.postsScanned ?? 0;
            const cats = s?.postsByCategory;
            const text = `🧹 Feed Cleaner scanned ${scanned} tweets:\n${cats?.ad ?? 0} ads hidden\n${cats?.ai ?? 0} AI posts flagged\n${cats?.bait ?? 0} engagement bait caught\n\nAll analysis runs locally. Zero data collected.`;
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
          📋 Share
        </button>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '10px', color: '#374151' }}>
        Feed Cleaner v2.0.0 · All analysis runs locally · Zero data collected
      </div>
    </div>
  );
}
