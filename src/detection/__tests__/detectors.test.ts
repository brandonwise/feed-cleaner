import { describe, it, expect } from 'vitest';
import { detectAd } from '../ad-detector';
import { detectAI } from '../ai-detector';
import { detectBait } from '../bait-detector';
import { detectBot } from '../bot-detector';
import { detectLowEffort } from '../low-effort-detector';
import type { TweetData } from '../../shared/types';

function makeTweet(overrides: Partial<TweetData> = {}): TweetData {
  const text = overrides.text ?? 'Just a normal tweet about my day';
  return {
    element: {} as HTMLElement,
    tweetId: '123',
    text,
    authorHandle: 'testuser',
    authorDisplayName: 'Test User',
    isVerified: false,
    isVerifiedOrg: false,
    isPromoted: false,
    isQuoteTweet: false,
    quotedText: null,
    isReply: false,
    isThread: false,
    hasMedia: false,
    hasExternalLink: false,
    linkDomains: [],
    wordCount: text.split(/\s+/).length,
    ...overrides,
  };
}

// ── Ad Detection ──────────────────────────────────────────────

describe('Ad Detector', () => {
  it('should flag promoted tweets', () => {
    const result = detectAd(makeTweet({ isPromoted: true }));
    expect(result).not.toBeNull();
    expect(result!.category).toBe('ad');
    expect(result!.confidence).toBe(100);
  });

  it('should flag verified org with CTA', () => {
    const result = detectAd(makeTweet({
      isVerifiedOrg: true,
      text: 'Try our new product today! Download now.',
    }));
    expect(result).not.toBeNull();
    expect(result!.category).toBe('ad');
  });

  it('should not flag normal tweets', () => {
    const result = detectAd(makeTweet());
    expect(result).toBeNull();
  });

  it('should flag app store links', () => {
    const result = detectAd(makeTweet({
      text: 'Check out our app!',
      linkDomains: ['apps.apple.com'],
      hasExternalLink: true,
    }));
    expect(result).not.toBeNull();
  });
});

// ── AI Detection ──────────────────────────────────────────────

describe('AI Detector', () => {
  it('should flag emoji-header list format', () => {
    const result = detectAI(makeTweet({
      text: '🔥 The Future of AI\n\n✅ Better reasoning\n✅ Faster inference\n✅ Lower costs',
      wordCount: 12,
    }));
    expect(result).not.toBeNull();
    expect(result!.category).toBe('ai');
  });

  it('should flag numbered list threads', () => {
    const result = detectAI(makeTweet({
      text: 'Here are my tips:\n1. Always be learning\n2. Network actively\n3. Ship fast\n4. Stay humble',
      wordCount: 18,
    }));
    expect(result).not.toBeNull();
  });

  it('should flag "Here are X things" pattern', () => {
    const result = detectAI(makeTweet({
      text: "Here are 10 things I learned about building startups that nobody tells you",
      wordCount: 13,
    }));
    expect(result).not.toBeNull();
  });

  it('should flag AI vocabulary clusters (3+)', () => {
    const result = detectAI(makeTweet({
      text: 'We must leverage this transformative paradigm to navigate the landscape of innovation',
      wordCount: 13,
    }));
    expect(result).not.toBeNull();
    expect(result!.signals.some(s => s.name === 'ai_vocab_cluster')).toBe(true);
  });

  it('should NOT flag single AI word', () => {
    const result = detectAI(makeTweet({
      text: "Let's delve into this topic more deeply when we have time",
      wordCount: 11,
    }));
    // Single AI word should not trigger the detector threshold
    expect(result === null || result.confidence < 15).toBe(true);
  });

  it('should not flag normal human tweets', () => {
    const result = detectAI(makeTweet({
      text: 'Just shipped a new feature. Pretty happy with how it turned out.',
      wordCount: 11,
    }));
    expect(result).toBeNull();
  });

  it('should flag parallel reframe pattern', () => {
    const result = detectAI(makeTweet({
      text: "Success isn't about money. It's about impact and making a difference.",
      wordCount: 11,
    }));
    expect(result).not.toBeNull();
    expect(result!.signals.some(s => s.name === 'parallel_structure')).toBe(true);
  });
});

// ── Bait Detection ────────────────────────────────────────────

describe('Bait Detector', () => {
  it('should flag "like if you agree"', () => {
    const result = detectBait(makeTweet({
      text: 'We need to bring back real music. Like if you agree! 🎵',
      wordCount: 11,
    }));
    expect(result).not.toBeNull();
    expect(result!.category).toBe('bait');
  });

  it('should flag rage bait', () => {
    const result = detectBait(makeTweet({
      text: "Nobody is talking about how they just changed the algorithm again",
      wordCount: 11,
    }));
    expect(result).not.toBeNull();
  });

  it('should flag false urgency from non-news', () => {
    const result = detectBait(makeTweet({
      text: 'BREAKING: Something happened that you need to know about right now',
      authorHandle: 'randomguy42',
      wordCount: 11,
    }));
    expect(result).not.toBeNull();
  });

  it('should NOT flag BREAKING from news accounts', () => {
    const result = detectBait(makeTweet({
      text: 'BREAKING: Major policy change announced today',
      authorHandle: 'reuters',
      wordCount: 6,
    }));
    // Reuters should be exempted
    expect(result === null || !result.signals.some(s => s.name === 'false_urgency')).toBe(true);
  });

  it('should not flag normal questions', () => {
    const result = detectBait(makeTweet({
      text: "Has anyone tried the new MacBook Air? Thinking about upgrading.",
      wordCount: 10,
    }));
    expect(result).toBeNull();
  });

  it('should flag clickbait hooks', () => {
    const result = detectBait(makeTweet({
      text: "You won't believe what happened at the meeting today",
      wordCount: 9,
    }));
    expect(result).not.toBeNull();
  });
});

// ── Bot Detection ─────────────────────────────────────────────

describe('Bot Detector', () => {
  it('should flag random numeric handles', () => {
    const result = detectBot(makeTweet({
      authorHandle: 'user83748291',
    }));
    expect(result).not.toBeNull();
    expect(result!.category).toBe('bot');
  });

  it('should flag crypto spam', () => {
    const result = detectBot(makeTweet({
      text: '🚀🚀🚀 $PEPE to the moon! 100x gains incoming! Buy now! 📈💰',
      wordCount: 12,
    }));
    expect(result).not.toBeNull();
  });

  it('should not flag normal users', () => {
    const result = detectBot(makeTweet({
      authorHandle: 'brandonwise',
      text: 'Working on a new project today',
    }));
    expect(result).toBeNull();
  });
});

// ── Low Effort Detection ──────────────────────────────────────

describe('Low Effort Detector', () => {
  it('should flag ultra-short tweets', () => {
    const result = detectLowEffort(makeTweet({
      text: 'lol',
      wordCount: 1,
    }));
    expect(result).not.toBeNull();
  });

  it('should flag empty quote tweets', () => {
    const result = detectLowEffort(makeTweet({
      text: 'This.',
      wordCount: 1,
      isQuoteTweet: true,
    }));
    expect(result).not.toBeNull();
  });

  it('should not flag substantive tweets', () => {
    const result = detectLowEffort(makeTweet({
      text: 'Just finished reading the quarterly earnings report. Revenue up 15% YoY.',
      wordCount: 11,
    }));
    expect(result).toBeNull();
  });

  it('should not flag short replies', () => {
    const result = detectLowEffort(makeTweet({
      text: 'Yep',
      wordCount: 1,
      isReply: true,
    }));
    // Replies are expected to be short
    expect(result).toBeNull();
  });
});
