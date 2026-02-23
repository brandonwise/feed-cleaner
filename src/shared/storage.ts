// Chrome storage helpers
import { STORAGE_KEYS, DEFAULT_SETTINGS } from './constants';
import type { UserSettings, SessionStats, DailyStats, AllTimeStats, AccountProfile } from './types';

// Helper to safely get from chrome storage with type assertion
async function syncGet(key: string): Promise<any> {
  const result = await chrome.storage.sync.get(key);
  return result[key];
}
async function localGet(key: string): Promise<any> {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

// ── Settings ──────────────────────────────────────────────────

export async function getSettings(): Promise<UserSettings> {
  const stored = await syncGet(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...(stored || {}) } as UserSettings;
}

export async function updateSettings(partial: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await chrome.storage.sync.set({ [STORAGE_KEYS.settings]: updated });
  return updated;
}

// ── Session Stats ─────────────────────────────────────────────

export function newSessionStats(): SessionStats {
  return {
    postsScanned: 0,
    postsFiltered: 0,
    postsDimmed: 0,
    gemsFound: 0,
    sessionStart: Date.now(),
    avgFeedScore: 0,
    scoreSum: 0,
  };
}

export async function getSessionStats(): Promise<SessionStats> {
  const stored = await localGet(STORAGE_KEYS.sessionStats);
  return (stored as SessionStats) || newSessionStats();
}

export async function updateSessionStats(stats: SessionStats): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.sessionStats]: stats });
}

// ── Daily Stats ───────────────────────────────────────────────

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getDailyStats(): Promise<DailyStats> {
  const stored = await localGet(STORAGE_KEYS.dailyStats);
  const all: Record<string, DailyStats> = (stored as Record<string, DailyStats>) || {} as Record<string, DailyStats>;
  const today = todayKey();
  return all[today] || {
    date: today,
    postsScanned: 0,
    postsFiltered: 0,
    gemsFound: 0,
    avgFeedScore: 0,
    estimatedMinutesSaved: 0,
    topFlags: {},
  };
}

export async function updateDailyStats(stats: DailyStats): Promise<void> {
  const stored = await localGet(STORAGE_KEYS.dailyStats);
  const all: Record<string, DailyStats> = (stored as Record<string, DailyStats>) || {} as Record<string, DailyStats>;
  all[stats.date] = stats;

  // Keep last 90 days only
  const keys = Object.keys(all).sort();
  if (keys.length > 90) {
    for (const key of keys.slice(0, keys.length - 90)) {
      delete all[key];
    }
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.dailyStats]: all });
}

// ── All-Time Stats ────────────────────────────────────────────

export async function getAllTimeStats(): Promise<AllTimeStats> {
  const stored = await localGet(STORAGE_KEYS.allTimeStats);
  return (stored as AllTimeStats) || {
    totalPostsScanned: 0,
    totalPostsFiltered: 0,
    totalGemsFound: 0,
    totalMinutesSaved: 0,
    installDate: Date.now(),
    dailyStats: [],
  };
}

export async function updateAllTimeStats(stats: AllTimeStats): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.allTimeStats]: stats });
}

// ── Account Profiles ──────────────────────────────────────────

export async function getAccountProfiles(): Promise<Record<string, AccountProfile>> {
  const stored = await localGet(STORAGE_KEYS.accountProfiles);
  return (stored as Record<string, AccountProfile>) || {} as Record<string, AccountProfile>;
}

export async function updateAccountProfile(profile: AccountProfile): Promise<void> {
  const profiles = await getAccountProfiles();
  profiles[profile.handle] = profile;

  // Prune if too many (keep most recently seen)
  const entries = Object.entries(profiles);
  if (entries.length > 500) {
    entries.sort((a, b) => b[1].lastSeen - a[1].lastSeen);
    const pruned = Object.fromEntries(entries.slice(0, 500));
    await chrome.storage.local.set({ [STORAGE_KEYS.accountProfiles]: pruned });
  } else {
    await chrome.storage.local.set({ [STORAGE_KEYS.accountProfiles]: profiles });
  }
}

// ── Post Score Cache ──────────────────────────────────────────

export async function getCachedScore(tweetId: string): Promise<number | null> {
  const stored = await localGet(STORAGE_KEYS.postCache);
  const cache = (stored as Record<string, number>) || {} as Record<string, number>;
  return cache[tweetId] ?? null;
}

export async function cacheScore(tweetId: string, score: number): Promise<void> {
  const stored = await localGet(STORAGE_KEYS.postCache);
  const cache = (stored as Record<string, number>) || {} as Record<string, number>;
  cache[tweetId] = score;

  // Prune old entries (keep last 5000)
  const keys = Object.keys(cache);
  if (keys.length > 5000) {
    for (const key of keys.slice(0, keys.length - 5000)) {
      delete cache[key];
    }
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.postCache]: cache });
}
