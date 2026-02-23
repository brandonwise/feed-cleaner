// Detection engine types

export interface DetectionResult {
  score: number;          // 0-100 for this category
  flags: DetectionFlag[];
  confidence: number;     // 0-1, how confident in this score
}

export interface DetectionFlag {
  name: string;
  label: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  score: number;
}

export interface TextStats {
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  sentenceLengthVariance: number;
  uniqueWordRatio: number;  // type-token ratio
  avgWordLength: number;
  syllablesPerWord: number;
  fleschKincaid: number;
  burstiness: number;       // sentence length variation (high = more human)
}

export interface AnalysisContext {
  text: string;
  stats: TextStats;
  authorHandle?: string;
  authorMeta?: {
    followersCount?: number;
    followingCount?: number;
    postCount?: number;
    accountAge?: number;
    isVerified?: boolean;
  };
  isReply: boolean;
  isQuote: boolean;
  hasMedia: boolean;
  hasLinks: boolean;
}
