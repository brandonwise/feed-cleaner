// Tweet Scanner v2 — extracts rich tweet data from DOM
import type { TweetData } from '../shared/types';

/** Extract tweet data from an article element in X's feed */
export function extractTweet(article: HTMLElement): TweetData | null {
  try {
    // ── Text ──────────────────────────────────────────────────
    const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
    const text = tweetTextEl?.textContent?.trim() || '';

    // ── Author ────────────────────────────────────────────────
    let authorHandle = '';
    let authorDisplayName = '';

    const userNameEl = article.querySelector('[data-testid="User-Name"]');
    if (userNameEl) {
      // Display name is usually the first text node or span
      const nameSpans = userNameEl.querySelectorAll('span');
      for (const span of nameSpans) {
        const t = span.textContent?.trim();
        if (t && t.length > 0 && !t.startsWith('@') && t !== '·' && !t.includes('·')) {
          authorDisplayName = t;
          break;
        }
      }
      // Handle is the @mention
      const handleSpan = userNameEl.querySelector('a[href^="/"] span');
      if (!authorHandle) {
        const links = userNameEl.querySelectorAll('a[href^="/"]');
        for (const link of links) {
          const href = (link as HTMLAnchorElement).pathname;
          const match = href.match(/^\/(\w+)\/?$/);
          if (match && !['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings'].includes(match[1])) {
            authorHandle = match[1];
            break;
          }
        }
      }
    }

    // Fallback for handle
    if (!authorHandle) {
      const userLinks = article.querySelectorAll('a[href^="/"]');
      for (const link of userLinks) {
        const href = (link as HTMLAnchorElement).pathname;
        const match = href.match(/^\/(\w+)\/?$/);
        if (match && !['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings'].includes(match[1])) {
          authorHandle = match[1];
          break;
        }
      }
    }

    // ── Tweet ID ──────────────────────────────────────────────
    let tweetId = '';
    const statusLinks = article.querySelectorAll('a[href*="/status/"]');
    for (const link of statusLinks) {
      const href = (link as HTMLAnchorElement).pathname;
      const match = href.match(/\/status\/(\d+)/);
      if (match) {
        tweetId = match[1];
        break;
      }
    }
    if (!tweetId) {
      tweetId = `fc_${hashCode(text + authorHandle)}`;
    }

    // ── Promoted detection (DOM-based) ────────────────────────
    let isPromoted = false;

    // Check for placementTracking ancestor
    const parent = article.closest('[data-testid="placementTracking"]');
    if (parent) isPromoted = true;

    // Check for "Promoted" or "Ad" text in the tweet footer
    if (!isPromoted) {
      const spans = article.querySelectorAll('span');
      for (const span of spans) {
        const t = span.textContent?.trim().toLowerCase();
        if (t === 'promoted' || t === 'ad' || t === 'sponsored') {
          isPromoted = true;
          break;
        }
      }
    }

    // ── Verification badges ───────────────────────────────────
    let isVerified = false;
    let isVerifiedOrg = false;

    // Blue checkmark
    const verifiedBadge = article.querySelector('[data-testid="icon-verified"]');
    if (verifiedBadge) {
      isVerified = true;
      // Gold checkmark for orgs — check SVG color or parent attributes
      const svg = verifiedBadge.querySelector('svg');
      if (svg) {
        const fill = svg.getAttribute('fill') || '';
        const color = getComputedStyle(svg).color;
        // Gold/yellow fill indicates org verification
        if (fill.includes('EAB308') || fill.includes('D4A800') || color.includes('rgb(234, 179, 8)')) {
          isVerifiedOrg = true;
        }
      }
    }

    // ── Context detection ─────────────────────────────────────
    const isReply = !!article.querySelector('[data-testid="tweet-reply-context"]') ||
                    (article.textContent?.includes('Replying to') ?? false);

    const isQuoteTweet = !!article.querySelector('[data-testid="quoteTweet"]');

    let quotedText: string | null = null;
    if (isQuoteTweet) {
      const quoteEl = article.querySelector('[data-testid="quoteTweet"] [data-testid="tweetText"]');
      quotedText = quoteEl?.textContent?.trim() || null;
    }

    // Thread detection: same author in consecutive tweets
    const isThread = false; // TODO: track consecutive same-author tweets

    // ── Media detection ───────────────────────────────────────
    const hasMedia = !!article.querySelector('[data-testid="tweetPhoto"]') ||
                     !!article.querySelector('video') ||
                     !!article.querySelector('[data-testid="card.wrapper"]');

    // ── Link detection ────────────────────────────────────────
    const linkDomains: string[] = [];
    let hasExternalLink = false;

    const links = article.querySelectorAll('a[href]');
    for (const link of links) {
      const href = (link as HTMLAnchorElement).href;
      try {
        const url = new URL(href);
        if (!url.hostname.includes('x.com') && !url.hostname.includes('twitter.com') && !url.hostname.includes('t.co')) {
          hasExternalLink = true;
          linkDomains.push(url.hostname);
        }
        // Also resolve t.co links via the visible text (X shows the real URL)
        const visibleText = link.textContent?.trim() || '';
        if (url.hostname === 't.co' && visibleText && !visibleText.startsWith('http')) {
          // The displayed text often shows the real domain
          hasExternalLink = true;
        }
      } catch { /* invalid URL */ }
    }

    // ── Word count ────────────────────────────────────────────
    const wordCount = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;

    // Skip completely empty tweets (media-only is fine with isPromoted check)
    if (!text && !isPromoted && !hasMedia) return null;

    return {
      element: article,
      tweetId,
      text,
      authorHandle,
      authorDisplayName,
      isVerified,
      isVerifiedOrg,
      isPromoted,
      isQuoteTweet,
      quotedText,
      isReply,
      isThread,
      hasMedia,
      hasExternalLink,
      linkDomains: [...new Set(linkDomains)],
      wordCount,
    };
  } catch {
    return null;
  }
}

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
