// Detection Pipeline v2 — multi-category flagging
import type { TweetData, DetectionResult, CategoryFlag } from '../shared/types';
import { detectAd } from './ad-detector';
import { detectAI } from './ai-detector';
import { detectBait } from './bait-detector';
import { detectBot } from './bot-detector';
import { detectLowEffort } from './low-effort-detector';

/**
 * Run all detectors on a tweet.
 * Returns a list of category flags (may be empty for clean tweets).
 */
export function detectAll(tweet: TweetData): DetectionResult {
  const flags: CategoryFlag[] = [];

  const ad = detectAd(tweet);
  if (ad) flags.push(ad);

  const ai = detectAI(tweet);
  if (ai) flags.push(ai);

  const bait = detectBait(tweet);
  if (bait) flags.push(bait);

  const bot = detectBot(tweet);
  if (bot) flags.push(bot);

  const lowEffort = detectLowEffort(tweet);
  if (lowEffort) flags.push(lowEffort);

  // Sort by confidence (highest first)
  flags.sort((a, b) => b.confidence - a.confidence);

  return {
    tweetId: tweet.tweetId,
    flags,
    timestamp: Date.now(),
  };
}

export { detectAd, detectAI, detectBait, detectBot, detectLowEffort };
