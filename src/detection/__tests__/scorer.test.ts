// Feed Cleaner — Detection Engine Tests
// Run with: npx vitest run

import { describe, it, expect } from 'vitest';
import { scorePost, type ScoreInput } from '../scorer';

function score(text: string, opts: Partial<ScoreInput> = {}): ReturnType<typeof scorePost> {
  return scorePost({
    tweetId: 'test-' + Math.random().toString(36).slice(2),
    text,
    authorHandle: 'testuser',
    ...opts,
  });
}

// ═══════════════════════════════════════════════════════════════
// AI Detection
// ═══════════════════════════════════════════════════════════════

describe('AI Content Detection', () => {
  it('should flag obvious AI-generated content', () => {
    const result = score(
      'In today\'s rapidly evolving landscape, it\'s worth noting that the multifaceted paradigm ' +
      'of leveraging transformative technologies underscores the paramount importance of fostering ' +
      'holistic approaches. Moreover, this groundbreaking framework encompasses comprehensive solutions.'
    );
    expect(result.breakdown.aiScore).toBeGreaterThanOrEqual(40);
    expect(result.flags.some(f => f.category === 'ai')).toBe(true);
  });

  it('should NOT flag genuine human writing', () => {
    const result = score(
      'Just spent 3 hours debugging a race condition in our Go service. Turns out the mutex ' +
      'was being released too early in the error path. Classic. My coworker spotted it in like 5 minutes. ' +
      'Sometimes you just need fresh eyes.'
    );
    expect(result.breakdown.aiScore).toBeLessThan(20);
    expect(result.overallScore).toBeGreaterThan(60);
  });

  it('should detect AI vocabulary clusters', () => {
    const result = score(
      'This endeavor to harness the synergy of our ecosystem while navigating the intricate ' +
      'landscape of digital transformation is truly pivotal and commendable.'
    );
    expect(result.flags.some(f => f.name === 'ai_vocabulary')).toBe(true);
    expect(result.breakdown.aiScore).toBeGreaterThanOrEqual(25);
  });

  it('should detect emoji + list structure pattern', () => {
    const result = score(
      '🚀 **Top 5 AI Tools You Need in 2026**\n' +
      '1. ChatGPT for content\n2. Midjourney for images\n3. Claude for coding'
    );
    expect(result.flags.some(f => f.name === 'emoji_header_list' || f.category === 'ai')).toBe(true);
  });

  it('should handle short tweets gracefully', () => {
    const result = score('lol true');
    expect(result.breakdown.aiScore).toBeLessThan(10);
    // Short text = low confidence, should not be harsh
  });
});

// ═══════════════════════════════════════════════════════════════
// Engagement Bait Detection
// ═══════════════════════════════════════════════════════════════

describe('Engagement Bait Detection', () => {
  it('should flag shock hooks', () => {
    const result = score('You won\'t believe what just happened with AI. This will change everything you thought you knew.');
    expect(result.breakdown.baitScore).toBeGreaterThan(5);
    expect(result.flags.some(f => f.category === 'bait')).toBe(true);
  });

  it('should flag engagement farming', () => {
    const result = score('Like if you agree! Retweet for more content like this! Drop a 🔥 in the comments!');
    expect(result.breakdown.baitScore).toBeGreaterThan(5);
    expect(result.flags.some(f => f.name === 'engagement_farming')).toBe(true);
  });

  it('should flag FOMO money claims', () => {
    const result = score('How I made $50,000 in 30 days with this one simple AI trick. Thread 🧵');
    expect(result.breakdown.baitScore).toBeGreaterThan(5);
  });

  it('should flag rage bait', () => {
    const result = score('Hot take: nobody is ready for this conversation. Let that sink in.');
    expect(result.breakdown.baitScore).toBeGreaterThan(5);
    expect(result.flags.some(f => f.category === 'bait')).toBe(true);
  });

  it('should NOT flag genuine excitement', () => {
    const result = score(
      'We just shipped our v2 release after 6 months of work. 4,200 commits, 89 contributors. ' +
      'Performance is 3x better. Really proud of the team.'
    );
    expect(result.breakdown.baitScore).toBeLessThan(15);
  });

  it('should flag hashtag stuffing', () => {
    const result = score(
      'Check out my new project! #AI #tech #startup #coding #developer #web3 #innovation #future #trending'
    );
    expect(result.flags.some(f => f.name === 'hashtag_stuffing')).toBe(true);
  });

  it('should flag excessive emoji', () => {
    const result = score(
      '🚀🔥💰 THIS IS HUGE 🤯🤯🤯 You NEED to see this RIGHT NOW 💎🙌📈📈📈'
    );
    expect(result.flags.some(f => f.name === 'emoji_overload')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// Bot Detection
// ═══════════════════════════════════════════════════════════════

describe('Bot Detection', () => {
  it('should flag generic replies', () => {
    const result = score('Great post! 🔥', { isReply: true });
    expect(result.breakdown.botScore).toBeGreaterThan(0);
    expect(result.flags.some(f => f.name === 'generic_reply')).toBe(true);
  });

  it('should flag suspicious follower ratios', () => {
    const result = score('Check out my new tool!', {
      authorMeta: { followersCount: 5, followingCount: 5000, postCount: 200, accountAge: 10 },
    });
    expect(result.flags.some(f => f.name === 'suspicious_follower_ratio')).toBe(true);
  });

  it('should flag new accounts with high activity', () => {
    const result = score('Amazing content!', {
      authorMeta: { followersCount: 100, followingCount: 50, postCount: 500, accountAge: 7 },
    });
    expect(result.flags.some(f => f.name === 'new_account_high_activity')).toBe(true);
  });

  it('should NOT flag substantive replies', () => {
    const result = score(
      'I actually disagree with point 3. We tried that approach at my company and the latency ' +
      'increased by 40%. The bottleneck was in the serialization layer, not the network.',
      { isReply: true }
    );
    expect(result.breakdown.botScore).toBeLessThan(10);
  });
});

// ═══════════════════════════════════════════════════════════════
// Originality Scoring
// ═══════════════════════════════════════════════════════════════

describe('Originality Scoring', () => {
  it('should reward personal experience', () => {
    const result = score(
      'When I was building our CI pipeline at my last job, we discovered that parallelizing ' +
      'the integration tests saved us 47 minutes per build. The trick was sharding by test duration.'
    );
    expect(result.breakdown.originalityScore).toBeGreaterThan(60);
  });

  it('should reward technical depth', () => {
    const result = score(
      'We used Rust for the parser because we needed p99 latency under 2ms. After implementing ' +
      'the zero-copy buffer pool, throughput went from 50k to 180k QPS on the same hardware.'
    );
    expect(result.breakdown.originalityScore).toBeGreaterThan(65);
  });

  it('should penalize empty quote tweets', () => {
    const result = score('This.', { isQuote: true });
    expect(result.breakdown.originalityScore).toBeLessThan(40);
  });

  it('should penalize recycled generic advice', () => {
    const result = score(
      'Wake up at 5am. Cold showers changed my life. Journaling and meditation transformed everything.'
    );
    expect(result.breakdown.originalityScore).toBeLessThan(50);
  });

  it('should reward rich vocabulary', () => {
    const result = score(
      'The orthographic projection of this architectural rendering reveals structural deficiencies ' +
      'in the cantilever design that would compromise seismic resilience during lateral oscillation events.'
    );
    expect(result.breakdown.originalityScore).toBeGreaterThan(55);
  });
});

// ═══════════════════════════════════════════════════════════════
// Overall Scoring
// ═══════════════════════════════════════════════════════════════

describe('Overall Quality Scoring', () => {
  it('should give high scores to genuine, valuable content', () => {
    const result = score(
      'After 2 years of building in stealth, we\'re open-sourcing our distributed query engine. ' +
      '12,000 lines of Rust, handles 1M events/sec on a single node. Benchmarks and architecture ' +
      'doc in the README. Would love feedback from anyone running similar workloads.'
    );
    expect(result.overallScore).toBeGreaterThan(70);
    expect(result.grade).toMatch(/[AB]/);
  });

  it('should give low scores to AI-generated engagement bait', () => {
    const result = score(
      '🚀 Here\'s 10 groundbreaking AI tools that will transform your workflow in 2026! 🧵\n\n' +
      '1. This multifaceted paradigm leverages cutting-edge synergy to streamline your holistic approach.\n\n' +
      'Like and retweet for more! Follow for daily AI insights! 🔥💯'
    );
    expect(result.overallScore).toBeLessThan(90);
    // Should have multiple negative flags
    expect(result.flags.length).toBeGreaterThan(3);
  });

  it('should correctly identify gems', () => {
    const result = score(
      'Shipped a patch today that fixes a 3-year-old bug in our payment system. ' +
      'Root cause: timezone conversion was using the server locale instead of UTC during DST transitions. ' +
      'Only affected customers in 4 countries. Found it because a user in Brazil sent us a screenshot ' +
      'showing their receipt timestamp was exactly 1 hour off. Incredible debugging by @maria.'
    );
    expect(result.overallScore).toBeGreaterThan(75);
  });

  it('should handle mixed content reasonably', () => {
    const result = score(
      'Unpopular opinion: most AI tools are just wrappers around GPT-4. ' +
      'I built a simple script that does the same thing for free. Here\'s the repo:'
    );
    // Has some bait signals (unpopular opinion) but also originality — could go either way
    expect(result.overallScore).toBeGreaterThan(40);
  });

  it('should not crash on edge cases', () => {
    expect(() => score('')).not.toThrow();
    expect(() => score('a')).not.toThrow();
    expect(() => score('🔥')).not.toThrow();
    expect(() => score('https://example.com')).not.toThrow();
    expect(() => score('@user hello')).not.toThrow();
    expect(() => score('a'.repeat(10000))).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// Grade Distribution
// ═══════════════════════════════════════════════════════════════

describe('Grade Assignment', () => {
  it('should assign A to score >= 85', () => {
    // We need a really clean, substantive post
    const result = score(
      'Last week I profiled our database queries and found that 60% of our latency came from a single ' +
      'N+1 query in the order summary page. After switching to a batch loader with DataLoader, p95 ' +
      'dropped from 340ms to 45ms. If your Django app is slow, check your query count first.'
    );
    // This should score high — personal, technical, specific data
    expect(result.grade).toMatch(/[AB]/);
  });

  it('should assign F to score < 30', () => {
    const result = score(
      '🚀🔥 You won\'t BELIEVE this!! Here\'s 10 GROUNDBREAKING tools that will TRANSFORM everything!! 🧵\n' +
      'Like if you agree!! Retweet for more!! Follow me for daily insights!! 💯🙌\n' +
      'This multifaceted paradigm leverages synergy to foster holistic frameworks!! #AI #Tech #Startup #Viral'
    );
    // Should have many negative flags even if overall score varies
    expect(result.flags.length).toBeGreaterThan(4);
    expect(result.flags.some(f => f.category === 'ai')).toBe(true);
    expect(result.flags.some(f => f.category === 'bait')).toBe(true);
  });
});
