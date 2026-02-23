// Engagement Bait Detection
import { BAIT_PATTERNS } from './patterns';
import type { AnalysisContext, DetectionResult, DetectionFlag } from './types';

/**
 * Detect engagement bait patterns.
 * Returns score 0-100 where higher = more baity.
 */
export function detectBait(ctx: AnalysisContext): DetectionResult {
  const flags: DetectionFlag[] = [];
  let totalScore = 0;

  // ── Pattern Matching ────────────────────────────────────────
  for (const bait of BAIT_PATTERNS) {
    if (bait.pattern.test(ctx.text)) {
      totalScore += bait.weight;
      flags.push({
        name: bait.name,
        label: bait.description,
        description: `Matched: ${bait.name.replace(/_/g, ' ')}`,
        severity: bait.weight >= 8 ? 'high' : bait.weight >= 5 ? 'medium' : 'low',
        score: bait.weight,
      });
    }
  }

  // ── Excessive Emoji Usage ───────────────────────────────────
  const emojiCount = (ctx.text.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
  const emojiRatio = ctx.stats.wordCount > 0 ? emojiCount / ctx.stats.wordCount : 0;

  if (emojiRatio > 0.15 && emojiCount >= 3) {
    const emojiScore = Math.min(8, Math.round(emojiRatio * 20));
    totalScore += emojiScore;
    flags.push({
      name: 'emoji_overload',
      label: 'Excessive Emoji Usage',
      description: `${emojiCount} emojis in ${ctx.stats.wordCount} words (${(emojiRatio * 100).toFixed(0)}% ratio)`,
      severity: emojiRatio > 0.3 ? 'high' : 'medium',
      score: emojiScore,
    });
  }

  // ── ALL CAPS Words ──────────────────────────────────────────
  const capsWords = ctx.text.split(/\s+/).filter(w => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
  if (capsWords.length >= 3) {
    const capsScore = Math.min(6, capsWords.length);
    totalScore += capsScore;
    flags.push({
      name: 'caps_abuse',
      label: 'CAPS Lock Abuse',
      description: `${capsWords.length} ALL-CAPS words: ${capsWords.slice(0, 3).join(', ')}`,
      severity: capsWords.length >= 5 ? 'high' : 'medium',
      score: capsScore,
    });
  }

  // ── Hashtag Stuffing ────────────────────────────────────────
  const hashtags = (ctx.text.match(/#\w+/g) || []);
  if (hashtags.length >= 5) {
    const hashScore = Math.min(8, hashtags.length - 3);
    totalScore += hashScore;
    flags.push({
      name: 'hashtag_stuffing',
      label: 'Hashtag Stuffing',
      description: `${hashtags.length} hashtags — likely optimizing for discovery, not conversation`,
      severity: hashtags.length >= 8 ? 'high' : 'medium',
      score: hashScore,
    });
  }

  // ── Question Farming ────────────────────────────────────────
  const questions = (ctx.text.match(/\?/g) || []).length;
  if (questions >= 3 && ctx.stats.wordCount < 50) {
    const qScore = Math.min(5, questions);
    totalScore += qScore;
    flags.push({
      name: 'question_farming',
      label: 'Question Farming',
      description: `${questions} questions in a short post — likely farming replies`,
      severity: 'medium',
      score: qScore,
    });
  }

  // ── "Follow me for more" type CTA ──────────────────────────
  if (/(?:follow\s+(?:me|for\s+more)|(?:link|more)\s+in\s+(?:bio|comments?|thread))/i.test(ctx.text)) {
    totalScore += 5;
    flags.push({
      name: 'self_promo_cta',
      label: 'Self-Promotion CTA',
      description: 'Contains follow/bio/link call-to-action',
      severity: 'medium',
      score: 5,
    });
  }

  // Bait patterns are strong signals even in short text — minimal confidence dampening
  const confidence = Math.min(1, 0.7 + ctx.stats.wordCount / 60);
  const finalScore = Math.min(100, Math.round(totalScore * confidence));

  return { score: finalScore, flags, confidence };
}
