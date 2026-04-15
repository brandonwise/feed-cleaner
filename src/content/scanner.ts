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

    // Check for "Promoted", "Ad", or "Sponsored" text anywhere in the tweet
    if (!isPromoted) {
      // Check all text nodes for ad labels — X puts "Ad" in various elements
      const allElements = article.querySelectorAll('span, div');
      for (const el of allElements) {
        // Only check direct text content (not nested children) to avoid false positives
        const directText = Array.from(el.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE)
          .map(n => n.textContent?.trim().toLowerCase())
          .join('');
        if (directText === 'promoted' || directText === 'ad' || directText === 'sponsored') {
          isPromoted = true;
          break;
        }
      }

      // Fallback: check full textContent of small elements (< 15 chars)
      if (!isPromoted) {
        const smallSpans = article.querySelectorAll('span');
        for (const span of smallSpans) {
          const t = span.textContent?.trim();
          if (t && t.length <= 12) {
            const lower = t.toLowerCase();
            if (lower === 'promoted' || lower === 'ad' || lower === 'sponsored' || lower === 'promoted by') {
              isPromoted = true;
              break;
            }
          }
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

        const hostname = normalizeDomain(url.hostname);

        if (!isInternalDomain(hostname)) {
          hasExternalLink = true;
          linkDomains.push(hostname);
        }

        // Resolve t.co wrappers using visible/label text (X often shows the real domain)
        if (hostname === 't.co') {
          const candidateTexts = [
            link.textContent?.trim() || '',
            (link as HTMLAnchorElement).title?.trim() || '',
            link.getAttribute('aria-label')?.trim() || '',
          ];

          let extracted = false;
          for (const candidate of candidateTexts) {
            const displayDomain = extractDisplayDomain(candidate);
            if (displayDomain) {
              hasExternalLink = true;
              linkDomains.push(displayDomain);
              extracted = true;
              break;
            }
          }

          // Fallback: if X hides destination but text suggests an external target, mark as external.
          if (!extracted && looksLikeExternalHint(candidateTexts[0])) {
            hasExternalLink = true;
          }
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

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '');
}

function isInternalDomain(domain: string): boolean {
  return (
    domain === 'x.com' ||
    domain.endsWith('.x.com') ||
    domain === 'twitter.com' ||
    domain.endsWith('.twitter.com') ||
    domain === 't.co' ||
    domain.endsWith('.t.co')
  );
}

function looksLikeExternalHint(visibleText: string): boolean {
  if (!visibleText) return false;

  const text = visibleText.trim().toLowerCase();
  if (!text) return false;

  if (text.startsWith('x.com/') || text.startsWith('twitter.com/')) return false;
  if (text.startsWith('http://x.com') || text.startsWith('https://x.com')) return false;
  if (text.startsWith('http://twitter.com') || text.startsWith('https://twitter.com')) return false;

  return text.includes('.') || /(?:link\s+in\s+bio|shop|store|deal|guide|template)/i.test(text);
}

/**
 * Extract a probable destination domain from X's truncated link display text.
 * Example inputs: "linktr.ee/me", "https://amzn.to/deal", "(stan.store/kit)…"
 */
export function extractDisplayDomain(displayText: string): string | null {
  if (!displayText) return null;

  const cleaned = displayText
    .replace(/…/g, '')
    .replace(/^[\s\("'`\[]+/, '')
    .replace(/[\s\)"'`\],.;!?]+$/, '')
    .trim();

  if (!cleaned) return null;

  const token = cleaned.split(/\s+/)[0];
  const withoutProtocol = token.replace(/^https?:\/\//i, '');
  const hostCandidate = withoutProtocol.split(/[\/?#]/)[0];

  if (!hostCandidate || !hostCandidate.includes('.')) return null;

  const domain = normalizeDomain(hostCandidate);
  if (!/^[a-z0-9.-]+$/i.test(domain)) return null;
  if (isInternalDomain(domain)) return null;

  return domain;
}
