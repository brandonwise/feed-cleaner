// Tweet Scanner — observes the DOM and extracts tweets for scoring
import { scorePost, type ScoreInput } from '../detection/scorer';
import type { PostScore } from '../shared/types';

export interface TweetElement {
  element: HTMLElement;
  tweetId: string;
  text: string;
  authorHandle: string;
  isReply: boolean;
  isQuote: boolean;
  hasMedia: boolean;
  hasLinks: boolean;
}

/** Extract tweet data from an article element in X's feed */
export function extractTweet(article: HTMLElement): TweetElement | null {
  try {
    // Get tweet text
    const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
    const text = tweetTextEl?.textContent?.trim() || '';

    if (!text || text.length < 3) return null; // Skip empty/minimal tweets

    // Get author handle
    const userLinks = article.querySelectorAll('a[href^="/"]');
    let authorHandle = '';
    for (const link of userLinks) {
      const href = (link as HTMLAnchorElement).href;
      const match = href.match(/x\.com\/(\w+)/);
      if (match && !['home', 'explore', 'notifications', 'messages', 'i', 'search'].includes(match[1])) {
        authorHandle = match[1];
        break;
      }
    }

    // Get tweet ID from the status link
    let tweetId = '';
    const statusLinks = article.querySelectorAll('a[href*="/status/"]');
    for (const link of statusLinks) {
      const href = (link as HTMLAnchorElement).href;
      const match = href.match(/\/status\/(\d+)/);
      if (match) {
        tweetId = match[1];
        break;
      }
    }

    if (!tweetId) {
      // Fallback: generate from text hash
      tweetId = `fc_${hashCode(text + authorHandle)}`;
    }

    // Detect context
    const isReply = !!article.querySelector('[data-testid="tweet-reply-context"]') ||
                    article.textContent?.includes('Replying to') || false;
    const isQuote = !!article.querySelector('[data-testid="quoteTweet"]');
    const hasMedia = !!article.querySelector('[data-testid="tweetPhoto"]') ||
                     !!article.querySelector('video') ||
                     !!article.querySelector('[data-testid="card.wrapper"]');
    const hasLinks = /https?:\/\//.test(text);

    return {
      element: article,
      tweetId,
      text,
      authorHandle,
      isReply,
      isQuote,
      hasMedia,
      hasLinks,
    };
  } catch {
    return null;
  }
}

/** Score a tweet element */
export function scoreTweet(tweet: TweetElement): PostScore {
  const input: ScoreInput = {
    tweetId: tweet.tweetId,
    text: tweet.text,
    authorHandle: tweet.authorHandle,
    isReply: tweet.isReply,
    isQuote: tweet.isQuote,
    hasMedia: tweet.hasMedia,
    hasLinks: tweet.hasLinks,
  };

  return scorePost(input);
}

/** Simple hash for fallback IDs */
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
