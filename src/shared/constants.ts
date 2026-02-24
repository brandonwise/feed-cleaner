import type { UserSettings, SessionStats, Category } from './types';

export const DEFAULT_SETTINGS: UserSettings = {
  filters: {
    ad: 'hide',
    ai: 'dim',
    bait: 'dim',
    bot: 'hide',
    lowEffort: 'show',
  },
  whitelist: [],
  blacklist: [],
  showTags: true,
  showDetailOnClick: true,
};

export function newSessionStats(): SessionStats {
  return {
    postsScanned: 0,
    postsByCategory: { ad: 0, ai: 0, bait: 0, bot: 0, lowEffort: 0 },
    postsFiltered: 0,
    postsDimmed: 0,
    sessionStart: Date.now(),
  };
}

export const STORAGE_KEYS = {
  settings: 'fc_settings',
  sessionStats: 'fc_session_stats',
  dailyStats: 'fc_daily_stats',
  allTimeStats: 'fc_all_time_stats',
} as const;

export const AVG_READ_TIME_SECONDS = 8;
export const EXTENSION_NAME = 'Feed Cleaner';
export const EXTENSION_VERSION = '2.0.0';

export const ALL_CATEGORIES: Category[] = ['ad', 'ai', 'bait', 'bot', 'lowEffort'];
