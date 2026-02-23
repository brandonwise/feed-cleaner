// Feed Cleaner — Background Service Worker
import {
  getSettings, updateSettings,
  getSessionStats, updateSessionStats, newSessionStats,
  getDailyStats, updateDailyStats,
  getAllTimeStats, updateAllTimeStats,
  updateAccountProfile, getAccountProfiles,
} from '../shared/storage';
import { AVG_READ_TIME_SECONDS } from '../shared/constants';
import type { SessionStats, DailyStats, AccountProfile } from '../shared/types';

console.log('[Feed Cleaner BG] Service worker started');

// ── Message Handler ───────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch(err => {
    console.error('[Feed Cleaner BG] Error:', err);
    sendResponse({ error: err.message });
  });
  return true; // async response
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
      const session = await getSessionStats();
      const daily = await getDailyStats();
      const allTime = await getAllTimeStats();
      return { session, daily, allTime };
    }

    case 'RECORD_STATS': {
      const stats = msg.payload as SessionStats & { estimatedMinutesSaved?: number };

      // Update session stats
      await updateSessionStats(stats);

      // Update daily stats
      const daily = await getDailyStats();
      daily.postsScanned = Math.max(daily.postsScanned, stats.postsScanned);
      daily.postsFiltered = Math.max(daily.postsFiltered, stats.postsFiltered);
      daily.gemsFound = Math.max(daily.gemsFound, stats.gemsFound);
      daily.avgFeedScore = stats.avgFeedScore;
      daily.estimatedMinutesSaved = stats.estimatedMinutesSaved
        ? Math.round(stats.estimatedMinutesSaved)
        : Math.round((stats.postsFiltered * AVG_READ_TIME_SECONDS) / 60);
      await updateDailyStats(daily);

      // Update all-time
      const allTime = await getAllTimeStats();
      allTime.totalPostsScanned += 1; // increment per batch
      allTime.totalMinutesSaved = daily.estimatedMinutesSaved;
      await updateAllTimeStats(allTime);

      return { ok: true };
    }

    case 'GET_ACCOUNTS': {
      const profiles = await getAccountProfiles();
      const sorted = Object.values(profiles)
        .sort((a, b) => b.postsAnalyzed - a.postsAnalyzed)
        .slice(0, msg.payload?.limit || 50);
      return sorted;
    }

    case 'RECORD_ACCOUNT': {
      const profile = msg.payload as AccountProfile;
      await updateAccountProfile(profile);
      return { ok: true };
    }

    case 'RESET_SESSION': {
      await updateSessionStats(newSessionStats());
      return { ok: true };
    }

    default:
      return { error: `Unknown message type: ${msg.type}` };
  }
}

// ── Daily Stats Reset ─────────────────────────────────────────

// Reset session stats on new day
chrome.alarms?.create('daily-reset', { periodInMinutes: 60 });
chrome.alarms?.onAlarm?.addListener((alarm) => {
  if (alarm.name === 'daily-reset') {
    // Session stats auto-reset when a new session starts
    console.log('[Feed Cleaner BG] Hourly check');
  }
});

// ── Install Event ─────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('[Feed Cleaner BG] First install!');
    const allTime = await getAllTimeStats();
    allTime.installDate = Date.now();
    await updateAllTimeStats(allTime);
  }
});
