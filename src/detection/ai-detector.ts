// AI Content Detection — ported from Humanizer, adapted for tweets
import { AI_VOCABULARY, AI_VOCAB_WEIGHTS, AI_STRUCTURAL_PATTERNS } from './patterns';
import type { AnalysisContext, DetectionResult, DetectionFlag } from './types';

/**
 * Detect AI-generated content.
 * Returns score 0-100 where higher = more likely AI generated.
 */
export function detectAI(ctx: AnalysisContext): DetectionResult {
  const flags: DetectionFlag[] = [];
  let totalScore = 0;

  const text = ctx.text.toLowerCase();
  const words = text.split(/\s+/);

  // ── AI Vocabulary Detection ─────────────────────────────────
  const foundWords: { word: string; weight: number }[] = [];

  for (const aiWord of AI_VOCABULARY) {
    const lower = aiWord.toLowerCase();
    // For phrases (containing space), check substring
    // For single words, check word boundary
    if (lower.includes(' ')) {
      if (text.includes(lower)) {
        foundWords.push({ word: aiWord, weight: AI_VOCAB_WEIGHTS[lower] || 3 });
      }
    } else {
      const regex = new RegExp(`\\b${lower}\\b`, 'i');
      if (regex.test(text)) {
        foundWords.push({ word: aiWord, weight: AI_VOCAB_WEIGHTS[lower] || 3 });
      }
    }
  }

  if (foundWords.length > 0) {
    const vocabScore = Math.min(40, foundWords.reduce((sum, w) => sum + w.weight, 0));
    totalScore += vocabScore;

    const severity = foundWords.length >= 4 ? 'high' : foundWords.length >= 2 ? 'medium' : 'low';
    flags.push({
      name: 'ai_vocabulary',
      label: 'AI Vocabulary Detected',
      description: `Found ${foundWords.length} AI-typical words: ${foundWords.slice(0, 5).map(w => w.word).join(', ')}${foundWords.length > 5 ? '...' : ''}`,
      severity,
      score: vocabScore,
    });
  }

  // ── Structural Pattern Detection ────────────────────────────
  for (const pattern of AI_STRUCTURAL_PATTERNS) {
    if (pattern.pattern && pattern.pattern.test(ctx.text)) {
      totalScore += pattern.weight;
      flags.push({
        name: pattern.name,
        label: pattern.description,
        description: `Detected: ${pattern.name.replace(/_/g, ' ')}`,
        severity: pattern.weight >= 7 ? 'high' : pattern.weight >= 4 ? 'medium' : 'low',
        score: pattern.weight,
      });
    }
  }

  // ── Sentence Uniformity ─────────────────────────────────────
  // AI produces suspiciously uniform sentence lengths
  if (ctx.stats.sentenceCount >= 3 && ctx.stats.burstiness < 0.2) {
    const uniformityScore = Math.round((0.2 - ctx.stats.burstiness) * 50);
    totalScore += uniformityScore;
    flags.push({
      name: 'sentence_uniformity',
      label: 'Uniform Sentence Length',
      description: `Burstiness: ${ctx.stats.burstiness.toFixed(2)} (human avg: 0.4-0.8). Sentences are suspiciously similar length.`,
      severity: ctx.stats.burstiness < 0.1 ? 'high' : 'medium',
      score: uniformityScore,
    });
  }

  // ── Low Type-Token Ratio ────────────────────────────────────
  // AI often has lower vocabulary diversity in short form
  if (ctx.stats.wordCount >= 20 && ctx.stats.uniqueWordRatio < 0.5) {
    const ttrScore = Math.round((0.5 - ctx.stats.uniqueWordRatio) * 30);
    totalScore += ttrScore;
    flags.push({
      name: 'low_ttr',
      label: 'Low Vocabulary Diversity',
      description: `Type-token ratio: ${ctx.stats.uniqueWordRatio.toFixed(2)} (expected >0.5). Repetitive word usage.`,
      severity: 'low',
      score: ttrScore,
    });
  }

  // ── Readability (AI tends to be mid-range FK) ───────────────
  // AI rarely produces very simple or very complex text
  if (ctx.stats.sentenceCount >= 2) {
    const fk = ctx.stats.fleschKincaid;
    // FK 8-12 is the "AI sweet spot" — suspiciously consistent
    if (fk >= 8 && fk <= 12 && ctx.stats.burstiness < 0.3) {
      totalScore += 5;
      flags.push({
        name: 'ai_readability_band',
        label: 'AI-Typical Readability',
        description: `FK grade ${fk.toFixed(1)} with low variance — typical of AI text.`,
        severity: 'low',
        score: 5,
      });
    }
  }

  // ── Short text adjustment ───────────────────────────────────
  // Reduce confidence for very short texts, but not too aggressively
  const confidence = Math.min(1, 0.5 + ctx.stats.wordCount / 40);

  // Normalize to 0-100
  const finalScore = Math.min(100, Math.round(totalScore * confidence));

  return { score: finalScore, flags, confidence };
}
