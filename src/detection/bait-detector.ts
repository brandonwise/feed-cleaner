// Engagement Bait Detector v2 — expanded pattern matching
import type { TweetData, CategoryFlag, Signal } from '../shared/types';

/**
 * Detect engagement bait patterns.
 * These are highly consistent and regex-able.
 */
export function detectBait(tweet: TweetData): CategoryFlag | null {
  const signals: Signal[] = [];
  const text = tweet.text;

  // ── HIGH confidence (15-25 pts) ─────────────────────────────

  // Direct engagement manipulation
  if (/(?:(?:like|retweet|repost|rt|share|follow)\s+(?:if\s+you|this\s+if|for\s+more)|(?:drop\s+a|comment)\s+[\u{1F300}-\u{1F9FF}👇❤🔥💀]|who(?:'s|\s+is)\s+with\s+me\??)/iu.test(text)) {
    signals.push({
      name: 'engagement_manipulation',
      label: 'Engagement Manipulation',
      description: '"Like if you agree", "RT if..." — asking for engagement directly',
      weight: 25,
      severity: 'high',
    });
  }

  // Rage bait
  if (/(?:nobody\s+(?:is\s+)?talk(?:s|ing)\s+about\s+(?:this|how)|why\s+is\s+(?:nobody|no\s*one)\s+(?:talking|upset)\s+about|am\s+i\s+the\s+only\s+one\s+who|can\s+we\s+(?:talk|agree)\s+(?:about\s+)?how)/i.test(text)) {
    signals.push({
      name: 'rage_bait',
      label: 'Rage Bait',
      description: '"Nobody is talking about this" — manufactured outrage',
      weight: 20,
      severity: 'high',
    });
  }

  // False urgency from non-news accounts
  if (/^(?:🚨+\s*)?(?:BREAKING|JUST IN|URGENT|ALERT|BREAKING NEWS)\s*[:\-!🚨]/i.test(text)) {
    // Only flag if it's not from a known news account (basic heuristic)
    const newsHandles = ['reuters', 'ap', 'baborjournal', 'nytimes', 'washingtonpost', 'bbc', 'cnn', 'foxnews', 'msnbc', 'bloomberg', 'cnbc', 'wsj'];
    if (!newsHandles.some(h => tweet.authorHandle.toLowerCase().includes(h))) {
      signals.push({
        name: 'false_urgency',
        label: 'False Urgency',
        description: '"BREAKING" from a non-news account',
        weight: 20,
        severity: 'high',
      });
    }
  }

  // ── MEDIUM confidence (8-15 pts) ────────────────────────────

  // Reply farming: multiple questions, short post
  const questionMarks = (text.match(/\?/g) || []).length;
  if (questionMarks >= 2 && tweet.wordCount < 30) {
    signals.push({
      name: 'reply_farming',
      label: 'Reply Farming',
      description: `${questionMarks} questions in a short post — fishing for replies`,
      weight: 12,
      severity: 'medium',
    });
  }

  // "Wrong answers only" / reply bait
  if (/(?:wrong\s+answers?\s+only|go\s*!?\s*$|let's\s+(?:settle\s+this|debate|argue|go)|what's\s+your\s+(?:hot\s+)?take\s*\??)/i.test(text)) {
    signals.push({
      name: 'reply_bait',
      label: 'Reply Bait',
      description: 'Question designed purely to generate replies',
      weight: 12,
      severity: 'medium',
    });
  }

  // Clickbait hooks
  if (/(?:you\s+won'?t\s+believe|this\s+(?:will\s+)?(?:blow\s+your\s+mind|change\s+(?:everything|your\s+life))|wait\s+(?:for\s+it|till\s+you\s+(?:see|hear))|I\s+(?:was|am)\s+shook|the\s+(?:best|worst)\s+part\s+is)/i.test(text)) {
    signals.push({
      name: 'clickbait_hook',
      label: 'Clickbait Hook',
      description: '"You won\'t believe..." — cliffhanger bait',
      weight: 15,
      severity: 'medium',
    });
  }

  // Vague teasing
  if (/(?:big\s+announcement\s+(?:coming\s+)?soon|something\s+(?:big|exciting|huge)\s+is\s+(?:coming|happening)|stay\s+tuned|can't\s+wait\s+to\s+(?:share|announce|reveal)|it's\s+finally\s+happening)/i.test(text)) {
    signals.push({
      name: 'vague_tease',
      label: 'Vague Tease',
      description: '"Big announcement coming soon" — empty hype',
      weight: 10,
      severity: 'medium',
    });
  }

  // "Hot take" / "Unpopular opinion" used as a hook
  if (/^(?:(?:hot|unpopular|controversial|spicy)\s+(?:take|opinion)\s*[:\-]|let\s+that\s+sink\s+in\s*\.?$)/im.test(text)) {
    signals.push({
      name: 'hot_take_hook',
      label: 'Hot Take Hook',
      description: '"Hot take:" used as engagement hook',
      weight: 10,
      severity: 'medium',
    });
  }

  // Self-promotion CTA
  if (/(?:follow\s+(?:me\s+)?for\s+more|link\s+in\s+(?:bio|comments?|thread|reply)|(?:join|subscribe\s+to)\s+my\s+(?:newsletter|community|discord|channel))/i.test(text)) {
    signals.push({
      name: 'self_promo',
      label: 'Self-Promotion',
      description: '"Follow me for more" / "Link in bio" — CTA',
      weight: 10,
      severity: 'medium',
    });
  }

  // ── LOW confidence (3-7 pts) ────────────────────────────────

  // Excessive emojis (🚨🔥💯 overuse)
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
  if (emojiCount >= 5 && tweet.wordCount > 0 && emojiCount / tweet.wordCount > 0.2) {
    signals.push({
      name: 'emoji_overload',
      label: 'Emoji Overload',
      description: `${emojiCount} emojis — attention-grabbing over substance`,
      weight: 5,
      severity: 'low',
    });
  }

  // Hashtag stuffing (5+)
  const hashtags = (text.match(/#\w+/g) || []).length;
  if (hashtags >= 5) {
    signals.push({
      name: 'hashtag_stuffing',
      label: 'Hashtag Stuffing',
      description: `${hashtags} hashtags — optimizing for discovery`,
      weight: 5,
      severity: 'low',
    });
  }

  // ALL CAPS words (3+)
  const capsWords = text.split(/\s+/).filter(w => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
  if (capsWords.length >= 4) {
    signals.push({
      name: 'caps_abuse',
      label: 'CAPS Abuse',
      description: `${capsWords.length} ALL-CAPS words — shouting for attention`,
      weight: 5,
      severity: 'low',
    });
  }

  // "Save this" / "Bookmark this" CTA
  if (/(?:save\s+this|bookmark\s+this|pin\s+this)\s+(?:for\s+later|before\s+it'?s?\s+(?:gone|deleted|removed|too\s+late))/i.test(text)) {
    signals.push({
      name: 'save_urgency',
      label: 'Save Urgency',
      description: '"Save this before it\'s gone" — false scarcity',
      weight: 8,
      severity: 'medium',
    });
  }

  // ── Calculate total ─────────────────────────────────────────

  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight < 10) return null;

  return {
    category: 'bait',
    confidence: Math.min(100, totalWeight),
    signals,
  };
}
