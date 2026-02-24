// Chrome storage helpers v2
import { STORAGE_KEYS, DEFAULT_SETTINGS } from './constants';
import type { UserSettings } from './types';

async function syncGet(key: string): Promise<any> {
  const result = await chrome.storage.sync.get(key);
  return result[key];
}

// ── Settings ──────────────────────────────────────────────────

export async function getSettings(): Promise<UserSettings> {
  const stored = await syncGet(STORAGE_KEYS.settings);
  if (!stored) return DEFAULT_SETTINGS;
  // Deep merge filters to handle partial updates
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    filters: { ...DEFAULT_SETTINGS.filters, ...(stored.filters || {}) },
  };
}

export async function updateSettings(partial: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getSettings();
  const updated: UserSettings = {
    ...current,
    ...partial,
    filters: partial.filters ? { ...current.filters, ...partial.filters } : current.filters,
  };
  await chrome.storage.sync.set({ [STORAGE_KEYS.settings]: updated });
  return updated;
}
