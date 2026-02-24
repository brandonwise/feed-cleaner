// Low Effort Content Detector
import type { TweetData, CategoryFlag, Signal } from '../shared/types';

/**
 * Detect low-effort content.
 * OFF by default — this is opinionated.
 */
export function detectLowEffort(tweet: TweetData): CategoryFlag | null {
  const signals: Signal[] = [];

  // Very short tweet with no media, not a reply
  if (tweet.wordCount <= 3 && !tweet.hasMedia && !tweet.isReply) {
    signals.push({
      name: 'ultra_short',
      label: 'Ultra Short',
      description: `${tweet.wordCount} words, no media — minimal content`,
      weight: 15,
      severity: 'low',
    });
  }

  // Pure emoji tweet (no actual text words)
  const stripped = tweet.text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]/gu, '');
  if (stripped.length === 0 && tweet.text.length > 0) {
    signals.push({
      name: 'emoji_only',
      label: 'Emoji Only',
      description: 'No actual text content',
      weight: 20,
      severity: 'low',
    });
  }

  // Quote tweet with zero/minimal commentary
  if (tweet.isQuoteTweet && tweet.wordCount <= 3) {
    const minimalComments = /^(?:this[!.]*|👆|💯|facts?[!.]*|real[!.]*|exactly|same|fr|deadass|lmao|lol)\s*$/i;
    if (minimalComments.test(tweet.text.trim()) || tweet.wordCount === 0) {
      signals.push({
        name: 'empty_quote',
        label: 'Empty Quote Tweet',
        description: 'Quote with no meaningful commentary',
        weight: 20,
        severity: 'medium',
      });
    }
  }

  // Link-only (URL and nothing else)
  if (tweet.hasExternalLink && tweet.wordCount <= 2) {
    signals.push({
      name: 'link_only',
      label: 'Link Only',
      description: 'Just a URL with no context',
      weight: 12,
      severity: 'low',
    });
  }

  // ── Calculate total ─────────────────────────────────────────

  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight < 12) return null;

  return {
    category: 'lowEffort',
    confidence: Math.min(100, totalWeight),
    signals,
  };
}
