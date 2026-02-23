// Feed Cleaner — Core Types

export interface PostScore {
  tweetId: string;
  authorHandle: string;
  text: string;
  overallScore: number; // 0-100, higher = better quality
  grade: Grade;
  breakdown: ScoreBreakdown;
  flags: Flag[];
  timestamp: number;
  isGem: boolean;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface ScoreBreakdown {
  aiScore: number;         // 0-100, higher = more likely AI generated
  baitScore: number;       // 0-100, higher = more engagement bait
  botScore: number;        // 0-100, higher = more bot-like
  originalityScore: number; // 0-100, higher = more original
}

export interface Flag {
  category: 'ai' | 'bait' | 'bot' | 'originality';
  label: string;       // Human-readable label, e.g. "AI Vocabulary Detected"
  description: string; // Detail, e.g. "Found 5 AI-typical words: delve, tapestry..."
  severity: 'low' | 'medium' | 'high';
  score: number;       // How much this flag contributed to the category score
}

export interface AccountProfile {
  handle: string;
  displayName: string;
  postsAnalyzed: number;
  avgScore: number;
  avgAiScore: number;
  avgBaitScore: number;
  avgBotScore: number;
  avgOriginalityScore: number;
  scoreHistory: number[];  // last 50 scores
  lastSeen: number;
  firstSeen: number;
}

export type FilterMode = 'highlight' | 'dim' | 'clean';

export interface UserSettings {
  mode: FilterMode;
  threshold: number;       // 0-100, posts below this get filtered
  enableAiDetection: boolean;
  enableBaitDetection: boolean;
  enableBotDetection: boolean;
  enableOriginalityDetection: boolean;
  whitelist: string[];     // handles to never filter
  blacklist: string[];     // handles to always filter
  showScoreBadge: boolean;
  showGems: boolean;
  showDetailOnClick: boolean;
  gemThreshold: number;    // score above this = gem (default 85)
  weights: {
    ai: number;            // 0-100, default 30
    bait: number;          // 0-100, default 30
    bot: number;           // 0-100, default 20
    originality: number;   // 0-100, default 20
  };
}

export interface SessionStats {
  postsScanned: number;
  postsFiltered: number;
  postsDimmed: number;
  gemsFound: number;
  sessionStart: number;
  avgFeedScore: number;
  scoreSum: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  postsScanned: number;
  postsFiltered: number;
  gemsFound: number;
  avgFeedScore: number;
  estimatedMinutesSaved: number;
  topFlags: Record<string, number>; // flag label → count
}

export interface AllTimeStats {
  totalPostsScanned: number;
  totalPostsFiltered: number;
  totalGemsFound: number;
  totalMinutesSaved: number;
  installDate: number;
  dailyStats: DailyStats[];
}

// Messages between content script ↔ background
export type Message =
  | { type: 'SCORE_POST'; payload: { tweetId: string; text: string; authorHandle: string; authorMeta?: AuthorMeta } }
  | { type: 'SCORE_RESULT'; payload: PostScore }
  | { type: 'GET_SETTINGS'; }
  | { type: 'SETTINGS_RESULT'; payload: UserSettings }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'GET_STATS'; }
  | { type: 'STATS_RESULT'; payload: { session: SessionStats; daily: DailyStats; allTime: AllTimeStats } }
  | { type: 'GET_ACCOUNTS'; payload?: { sortBy?: string; limit?: number } }
  | { type: 'ACCOUNTS_RESULT'; payload: AccountProfile[] }
  | { type: 'RECORD_SCORE'; payload: PostScore };

export interface AuthorMeta {
  followersCount?: number;
  followingCount?: number;
  postCount?: number;
  accountAge?: number; // days
  isVerified?: boolean;
  bio?: string;
}
