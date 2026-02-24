// Feed Cleaner v2 — Background Service Worker
import { getSettings, updateSettings } from '../shared/storage';
import { newSessionStats, AVG_READ_TIME_SECONDS, STORAGE_KEYS } from '../shared/constants';
import type { SessionStats, DailyStats, AllTimeStats } from '../shared/types';

console.log('[Feed Cleaner v2 BG] Service worker started');

// ── Storage helpers (inline to avoid chunk issues) ────────────

async function localGet(key: string): Promise<any> {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Message Handler ───────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch(err => {
    console.error('[Feed Cleaner v2 BG] Error:', err);
    sendResponse({ error: err.message });
  });
  return true;
});

async function handleMessage(msg: any): Promise<any> {
  switch (msg.type) {
    case 'GET_SETTINGS':
      return getSettings();

    case 'UPDATE_SETTINGS': {
      const updated = await updateSettings(msg.payload);
      // Notify all content scripts
      const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED', payload: updated }).catch(() => {});
        }
      }
      return updated;
    }

    case 'GET_STATS': {
      const session = await localGet(STORAGE_KEYS.sessionStats) as SessionStats || newSessionStats();
      const dailyAll = await localGet(STORAGE_KEYS.dailyStats) as Record<string, DailyStats> || {};
      const daily = dailyAll[todayKey()] || {
        date: todayKey(),
        postsScanned: 0,
        postsByCategory: { ad: 0, ai: 0, bait: 0, bot: 0, lowEffort: 0 },
        postsFiltered: 0,
        estimatedMinutesSaved: 0,
      };
      const allTime = await localGet(STORAGE_KEYS.allTimeStats) as AllTimeStats || {
        totalPostsScanned: 0,
        totalPostsFiltered: 0,
        totalMinutesSaved: 0,
        installDate: Date.now(),
      };
      return { session, daily, allTime };
    }

    case 'RECORD_STATS': {
      const stats = msg.payload as SessionStats;
      await chrome.storage.local.set({ [STORAGE_KEYS.sessionStats]: stats });

      // Update daily
      const dailyAll = await localGet(STORAGE_KEYS.dailyStats) as Record<string, DailyStats> || {};
      const today = todayKey();
      const daily = dailyAll[today] || {
        date: today,
        postsScanned: 0,
        postsByCategory: { ad: 0, ai: 0, bait: 0, bot: 0, lowEffort: 0 },
        postsFiltered: 0,
        estimatedMinutesSaved: 0,
      };
      daily.postsScanned = Math.max(daily.postsScanned, stats.postsScanned);
      daily.postsFiltered = Math.max(daily.postsFiltered, stats.postsFiltered);
      daily.postsByCategory = stats.postsByCategory;
      daily.estimatedMinutesSaved = Math.round((stats.postsFiltered * AVG_READ_TIME_SECONDS) / 60);
      dailyAll[today] = daily;

      // Keep last 90 days
      const keys = Object.keys(dailyAll).sort();
      if (keys.length > 90) {
        for (const key of keys.slice(0, keys.length - 90)) {
          delete dailyAll[key];
        }
      }
      await chrome.storage.local.set({ [STORAGE_KEYS.dailyStats]: dailyAll });

      return { ok: true };
    }

    case 'RESET_SESSION':
      await chrome.storage.local.set({ [STORAGE_KEYS.sessionStats]: newSessionStats() });
      return { ok: true };

    default:
      return { error: `Unknown message type: ${msg.type}` };
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('[Feed Cleaner v2 BG] First install');
    await chrome.storage.local.set({
      [STORAGE_KEYS.allTimeStats]: {
        totalPostsScanned: 0,
        totalPostsFiltered: 0,
        totalMinutesSaved: 0,
        installDate: Date.now(),
      },
    });
  }
});
