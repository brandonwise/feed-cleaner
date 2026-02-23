// Originality Scoring
import { LOW_ORIGINALITY_PATTERNS, QUALITY_SIGNALS } from './patterns';
import type { AnalysisContext, DetectionResult, DetectionFlag } from './types';

/**
 * Score content originality.
 * Returns score 0-100 where higher = MORE original (inverted from other detectors).
 * A high score here is GOOD.
 */
export function scoreOriginality(ctx: AnalysisContext): DetectionResult {
  const flags: DetectionFlag[] = [];

  // Start at 60 (neutral) and adjust up/down
  let score = 60;

  // ── Negative Signals (reduce originality) ───────────────────
  for (const pattern of LOW_ORIGINALITY_PATTERNS) {
    if (pattern.pattern.test(ctx.text)) {
      score -= pattern.weight * 5;
      flags.push({
        name: pattern.name,
        label: pattern.description,
        description: `Matched: ${pattern.name.replace(/_/g, ' ')}`,
        severity: pattern.weight >= 5 ? 'high' : 'medium',
        score: -pattern.weight * 5,
      });
    }
  }

  // ── Positive Signals (boost originality) ────────────────────
  for (const signal of QUALITY_SIGNALS) {
    if (signal.pattern.test(ctx.text)) {
      score += signal.weight * 5;
      flags.push({
        name: signal.name,
        label: signal.description,
        description: `Positive: ${signal.name.replace(/_/g, ' ')}`,
        severity: 'low', // positive flags
        score: signal.weight * 5,
      });
    }
  }

  // ── Text Length Bonus ───────────────────────────────────────
  // Longer, substantive posts are more likely original
  if (ctx.stats.wordCount >= 30 && !ctx.isReply) {
    score += 5;
  }
  if (ctx.stats.wordCount >= 80) {
    score += 5;
  }

  // ── Vocabulary Richness ─────────────────────────────────────
  // High TTR in a tweet suggests genuine thought
  if (ctx.stats.uniqueWordRatio > 0.7 && ctx.stats.wordCount >= 15) {
    score += 8;
    flags.push({
      name: 'rich_vocabulary',
      label: 'Rich Vocabulary',
      description: `TTR ${ctx.stats.uniqueWordRatio.toFixed(2)} — diverse word choice indicates original thought`,
      severity: 'low',
      score: 8,
    });
  }

  // ── High Burstiness ─────────────────────────────────────────
  // Natural writing varies sentence length
  if (ctx.stats.burstiness > 0.5 && ctx.stats.sentenceCount >= 3) {
    score += 5;
    flags.push({
      name: 'natural_rhythm',
      label: 'Natural Writing Rhythm',
      description: `Burstiness ${ctx.stats.burstiness.toFixed(2)} — varied sentence lengths suggest genuine writing`,
      severity: 'low',
      score: 5,
    });
  }

  // ── Quote-Tweet Without Commentary ──────────────────────────
  if (ctx.isQuote && ctx.stats.wordCount < 5) {
    score -= 25;
    flags.push({
      name: 'empty_quote',
      label: 'Quote Without Commentary',
      description: 'Quote tweet with almost no added value',
      severity: 'high',
      score: -25,
    });
  }

  // ── Very Short Posts ────────────────────────────────────────
  if (ctx.stats.wordCount < 5 && !ctx.hasMedia && !ctx.isReply) {
    score -= 10;
  }

  // Clamp to 0-100
  const finalScore = Math.max(0, Math.min(100, score));
  const confidence = Math.min(1, 0.3 + ctx.stats.wordCount / 40);

  return { score: finalScore, flags, confidence };
}
