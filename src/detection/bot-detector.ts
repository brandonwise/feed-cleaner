// Bot/Farm Account Detector
import type { TweetData, CategoryFlag, Signal } from '../shared/types';

/**
 * Detect bot/farm account patterns.
 * Uses observable DOM signals + content patterns.
 */
export function detectBot(tweet: TweetData): CategoryFlag | null {
  const signals: Signal[] = [];

  // ── Handle patterns ─────────────────────────────────────────

  // Random-looking handle: lots of numbers, random chars
  const handle = tweet.authorHandle;
  const digitCount = (handle.match(/\d/g) || []).length;
  if (digitCount >= 5 && handle.length <= 15) {
    signals.push({
      name: 'random_handle',
      label: 'Random Handle',
      description: `@${handle} — many digits, likely auto-generated`,
      weight: 15,
      severity: 'medium',
    });
  }

  // Handle matches template pattern: word + 4-8 random digits
  if (/^[a-zA-Z]{3,10}\d{4,8}$/.test(handle)) {
    signals.push({
      name: 'template_handle',
      label: 'Template Handle',
      description: `@${handle} — word + numbers pattern`,
      weight: 12,
      severity: 'medium',
    });
  }

  // ── Crypto/trading spam ─────────────────────────────────────

  const cryptoSignals = (tweet.text.match(/(?:🚀|📈|💰|💎|🙌|to\s+the\s+moon|\d+x\s+(?:gains?|returns?)|(?:buy|sell)\s+(?:now|before)|nfa|dyor|\$[A-Z]{2,6}\b)/gi) || []).length;
  if (cryptoSignals >= 3) {
    signals.push({
      name: 'crypto_spam',
      label: 'Crypto/Trading Spam',
      description: `${cryptoSignals} crypto spam signals — 🚀📈 overload`,
      weight: 20,
      severity: 'high',
    });
  }

  // ── Template tweets ─────────────────────────────────────────

  // Fill-in-the-blank format that bots use
  if (/^(?:[A-Z][a-z]+\s+){1,3}(?:is|isn't|are|aren't)\s+(?:about|for)\s+[a-z].*\.\s*(?:It's|They're)\s+(?:about|for)\s+/i.test(tweet.text)) {
    // This catches "Success isn't about money. It's about impact." bots
    if (tweet.wordCount < 25) {
      signals.push({
        name: 'template_tweet',
        label: 'Template Format',
        description: 'Fill-in-the-blank motivational template',
        weight: 15,
        severity: 'medium',
      });
    }
  }

  // ── Spam link patterns ──────────────────────────────────────

  const spamDomains = ['bit.ly', 't.co', 'tinyurl', 'shorturl', 'linktr.ee'];
  const hasSpamLink = tweet.linkDomains.some(d => spamDomains.some(s => d.includes(s)));
  if (hasSpamLink && tweet.wordCount < 15) {
    signals.push({
      name: 'spam_link',
      label: 'Short URL + Low Text',
      description: 'Shortened link with minimal context — likely spam',
      weight: 12,
      severity: 'medium',
    });
  }

  // ── Display name patterns ───────────────────────────────────

  // Emoji-stuffed display name (4+ emojis)
  const nameEmojis = (tweet.authorDisplayName.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
  if (nameEmojis >= 4) {
    signals.push({
      name: 'emoji_name',
      label: 'Emoji-Stuffed Name',
      description: `${nameEmojis} emojis in display name`,
      weight: 8,
      severity: 'low',
    });
  }

  // ── Calculate total ─────────────────────────────────────────

  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight < 15) return null;

  return {
    category: 'bot',
    confidence: Math.min(100, totalWeight),
    signals,
  };
}
