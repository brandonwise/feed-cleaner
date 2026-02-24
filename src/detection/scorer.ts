// Master Scorer — combines all detectors into a single quality score
import { detectAI } from './ai-detector';
import { detectBait } from './bait-detector';
import { detectBot } from './bot-detector';
import { scoreOriginality } from './originality-scorer';
import { analyzeText } from './text-stats';
import type { AnalysisContext } from './types';
import type { PostScore, Grade, Flag, AuthorMeta } from '../shared/types';

export interface ScoreInput {
  tweetId: string;
  text: string;
  authorHandle: string;
  authorMeta?: AuthorMeta;
  isReply?: boolean;
  isQuote?: boolean;
  hasMedia?: boolean;
  hasLinks?: boolean;
}

export interface ScoreWeights {
  ai: number;
  bait: number;
  bot: number;
  originality: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  ai: 30,
  bait: 30,
  bot: 20,
  originality: 20,
};

/**
 * Score a post across all dimensions and return a unified quality score.
 *
 * The overall score is 0-100 where:
 * - 85-100 = A (Gem — genuine, valuable content)
 * - 70-84  = B (Good — likely human, some value)
 * - 50-69  = C (Mixed — proceed with caution)
 * - 30-49  = D (Low quality — likely AI/bait/bot)
 * - 0-29   = F (Junk — strong signals of AI slop/bait/bot)
 */
export function scorePost(input: ScoreInput, weights: ScoreWeights = DEFAULT_WEIGHTS): PostScore {
  // Build analysis context
  const stats = analyzeText(input.text);

  const ctx: AnalysisContext = {
    text: input.text,
    stats,
    authorHandle: input.authorHandle,
    authorMeta: input.authorMeta,
    isReply: input.isReply ?? false,
    isQuote: input.isQuote ?? false,
    hasMedia: input.hasMedia ?? false,
    hasLinks: input.hasLinks ?? /https?:\/\//.test(input.text),
  };

  // Run all detectors
  const aiResult = detectAI(ctx);
  const baitResult = detectBait(ctx);
  const botResult = detectBot(ctx);
  const origResult = scoreOriginality(ctx);

  // ── Compute Overall Score ───────────────────────────────────
  // AI, bait, and bot scores are NEGATIVE signals (higher = worse)
  // Originality is a POSITIVE signal (higher = better)
  // We invert the negative signals to get a quality score

  const totalWeight = weights.ai + weights.bait + weights.bot + weights.originality;

  const qualityScore = Math.round(
    (
      (100 - aiResult.score) * weights.ai +
      (100 - baitResult.score) * weights.bait +
      (100 - botResult.score) * weights.bot +
      origResult.score * weights.originality
    ) / totalWeight
  );

  // Clamp to 0-100
  const overallScore = Math.max(0, Math.min(100, qualityScore));

  // ── Determine Grade ─────────────────────────────────────────
  const grade = scoreToGrade(overallScore);

  // ── Collect All Flags ───────────────────────────────────────
  const flags: Flag[] = [
    ...aiResult.flags.map(f => ({ ...f, category: 'ai' as const })),
    ...baitResult.flags.map(f => ({ ...f, category: 'bait' as const })),
    ...botResult.flags.map(f => ({ ...f, category: 'bot' as const })),
    ...origResult.flags.map(f => ({ ...f, category: 'originality' as const })),
  ];

  // Sort by severity (high first) then score (highest impact first)
  flags.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    const sDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (sDiff !== 0) return sDiff;
    return Math.abs(b.score) - Math.abs(a.score);
  });

  return {
    tweetId: input.tweetId,
    authorHandle: input.authorHandle,
    text: input.text,
    overallScore,
    grade,
    breakdown: {
      aiScore: aiResult.score,
      baitScore: baitResult.score,
      botScore: botResult.score,
      originalityScore: origResult.score,
    },
    flags,
    timestamp: Date.now(),
    isGem: overallScore >= 90,
  };
}

function scoreToGrade(score: number): Grade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

// ── Grade Colors (for UI) ─────────────────────────────────────
export const GRADE_COLORS: Record<Grade, { bg: string; text: string; border: string; glow: string }> = {
  A: { bg: '#065f46', text: '#6ee7b7', border: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' },
  B: { bg: '#064e3b', text: '#a7f3d0', border: '#34d399', glow: 'rgba(52, 211, 153, 0.2)' },
  C: { bg: '#78350f', text: '#fcd34d', border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.2)' },
  D: { bg: '#7c2d12', text: '#fdba74', border: '#f97316', glow: 'rgba(249, 115, 22, 0.2)' },
  F: { bg: '#7f1d1d', text: '#fca5a5', border: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
};

// ── Gem Styling ───────────────────────────────────────────────
export const GEM_STYLE = {
  border: '#fbbf24',
  glow: 'rgba(251, 191, 36, 0.4)',
  badge: '💎',
};
