// Feed Cleaner v2 — Core Types

// ── Detection Categories ──────────────────────────────────────

export type Category = 'ad' | 'ai' | 'bait' | 'bot' | 'lowEffort';
export type FilterAction = 'show' | 'dim' | 'hide';

export interface CategoryFlag {
  category: Category;
  confidence: number;      // 0-100
  signals: Signal[];
}

export interface Signal {
  name: string;
  label: string;
  description: string;
  weight: number;          // how much this contributed
  severity: 'low' | 'medium' | 'high';
}

// ── Tweet Data (extracted from DOM) ───────────────────────────

export interface TweetData {
  element: HTMLElement;
  tweetId: string;
  text: string;
  authorHandle: string;
  authorDisplayName: string;
  isVerified: boolean;
  isVerifiedOrg: boolean;      // gold checkmark (brand/org)
  isPromoted: boolean;          // DOM says it's an ad
  isQuoteTweet: boolean;
  quotedText: string | null;
  isReply: boolean;
  isThread: boolean;
  hasMedia: boolean;
  hasExternalLink: boolean;
  linkDomains: string[];
  wordCount: number;
}

// ── Detection Result ──────────────────────────────────────────

export interface DetectionResult {
  tweetId: string;
  flags: CategoryFlag[];        // may be empty (clean tweet)
  timestamp: number;
}

// ── Settings ──────────────────────────────────────────────────

export interface FilterSettings {
  ad: FilterAction;
  ai: FilterAction;
  bait: FilterAction;
  bot: FilterAction;
  lowEffort: FilterAction;
}

export interface UserSettings {
  filters: FilterSettings;
  whitelist: string[];
  blacklist: string[];
  showTags: boolean;           // show category tags on flagged tweets
  showDetailOnClick: boolean;
}

// ── Stats ─────────────────────────────────────────────────────

export interface SessionStats {
  postsScanned: number;
  postsByCategory: Record<Category, number>;
  postsFiltered: number;       // total hidden
  postsDimmed: number;         // total dimmed
  sessionStart: number;
}

export interface DailyStats {
  date: string;
  postsScanned: number;
  postsByCategory: Record<Category, number>;
  postsFiltered: number;
  estimatedMinutesSaved: number;
}

export interface AllTimeStats {
  totalPostsScanned: number;
  totalPostsFiltered: number;
  totalMinutesSaved: number;
  installDate: number;
}

// ── Messages ──────────────────────────────────────────────────

export type Message =
  | { type: 'GET_SETTINGS' }
  | { type: 'SETTINGS_RESULT'; payload: UserSettings }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'SETTINGS_UPDATED'; payload: UserSettings }
  | { type: 'GET_STATS' }
  | { type: 'STATS_RESULT'; payload: { session: SessionStats; daily: DailyStats; allTime: AllTimeStats } }
  | { type: 'RECORD_STATS'; payload: SessionStats }
  | { type: 'RESET_SESSION' };

// ── Category Metadata ─────────────────────────────────────────

export const CATEGORY_META: Record<Category, {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  ad:        { emoji: '🏷️', label: 'Ad',          color: '#9ca3af', bgColor: '#374151', borderColor: '#4b5563' },
  ai:        { emoji: '🤖', label: 'AI',          color: '#c084fc', bgColor: '#3b0764', borderColor: '#7c3aed' },
  bait:      { emoji: '🎣', label: 'Bait',        color: '#fb923c', bgColor: '#431407', borderColor: '#f97316' },
  bot:       { emoji: '🤖', label: 'Bot',         color: '#f87171', bgColor: '#450a0a', borderColor: '#ef4444' },
  lowEffort: { emoji: '📉', label: 'Low Effort',  color: '#6b7280', bgColor: '#1f2937', borderColor: '#374151' },
};
