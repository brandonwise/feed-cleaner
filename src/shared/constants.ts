import type { UserSettings } from './types';

export const DEFAULT_SETTINGS: UserSettings = {
  mode: 'highlight',
  threshold: 40,
  enableAiDetection: true,
  enableBaitDetection: true,
  enableBotDetection: true,
  enableOriginalityDetection: true,
  whitelist: [],
  blacklist: [],
  showScoreBadge: true,
  showGems: true,
  showDetailOnClick: true,
  gemThreshold: 85,
  weights: {
    ai: 30,
    bait: 30,
    bot: 20,
    originality: 20,
  },
};

export const STORAGE_KEYS = {
  settings: 'fc_settings',
  sessionStats: 'fc_session_stats',
  dailyStats: 'fc_daily_stats',
  allTimeStats: 'fc_all_time_stats',
  accountProfiles: 'fc_account_profiles',
  postCache: 'fc_post_cache',
} as const;

// Average reading time per filtered post (seconds)
export const AVG_READ_TIME_SECONDS = 8;

// Max posts to cache scores for
export const MAX_CACHE_SIZE = 5000;

// Max account profiles to store
export const MAX_ACCOUNT_PROFILES = 500;

export const EXTENSION_NAME = 'Feed Cleaner';
export const EXTENSION_VERSION = '1.0.0';
