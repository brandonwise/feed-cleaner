// Feed Cleaner v2 — Content Script
// Self-contained IIFE (built via Vite lib mode)
import { extractTweet } from './scanner';
import { detectAll } from '../detection/index';
import { applyTags, removeTags } from './overlay';
import { applyFilter } from './filter';
import { getSettings } from '../shared/storage';
import { newSessionStats } from '../shared/constants';
import type { UserSettings, SessionStats, Category, DetectionResult } from '../shared/types';

console.log('[Feed Cleaner v2] Content script loaded');

// ── State ─────────────────────────────────────────────────────

let settings: UserSettings;
const processedTweets = new Set<string>();
const resultCache = new Map<string, DetectionResult>();
let sessionStats: SessionStats = newSessionStats();

// ── Init ──────────────────────────────────────────────────────

async function init() {
  settings = await getSettings();
  console.log('[Feed Cleaner v2] Settings loaded, filters:', settings.filters);

  // Listen for settings changes
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SETTINGS_UPDATED') {
      settings = msg.payload;
      reprocessAll();
    }
  });

  // Start observing
  observeFeed();

  // Process existing tweets
  processVisibleTweets();
}

// ── Feed Observer ─────────────────────────────────────────────

function observeFeed() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          // Check if this node IS a tweet article
          if (node.matches?.('article[data-testid="tweet"]')) {
            processTweet(node);
          }
          // Check children for tweet articles
          const articles = node.querySelectorAll?.('article[data-testid="tweet"]');
          articles?.forEach(article => processTweet(article as HTMLElement));
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function processVisibleTweets() {
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  articles.forEach(article => processTweet(article as HTMLElement));
}

// ── Process a Single Tweet ────────────────────────────────────

function processTweet(article: HTMLElement) {
  const tweet = extractTweet(article);
  if (!tweet) return;

  // Skip if already processed
  if (processedTweets.has(tweet.tweetId)) return;
  processedTweets.add(tweet.tweetId);

  // Store author handle for whitelist check
  article.dataset.fcAuthor = tweet.authorHandle.toLowerCase();

  // Run detection pipeline
  const result = detectAll(tweet);
  resultCache.set(tweet.tweetId, result);

  // Update stats
  sessionStats.postsScanned++;
  for (const flag of result.flags) {
    sessionStats.postsByCategory[flag.category]++;
  }

  // Apply visual tags (if enabled and flagged)
  if (settings.showTags) {
    applyTags(article, result);
  }

  // Apply filter action
  const filterResult = applyFilter(article, result, settings);
  if (filterResult.action === 'hide') {
    sessionStats.postsFiltered++;
  } else if (filterResult.action === 'dim') {
    sessionStats.postsDimmed++;
  }

  // Report stats periodically
  if (sessionStats.postsScanned % 5 === 0) {
    reportStats();
  }
}

// ── Reprocess All ─────────────────────────────────────────────

function reprocessAll() {
  // Reset filter state, re-apply with new settings
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  articles.forEach(article => {
    const el = article as HTMLElement;
    const tweetId = el.dataset.fcProcessed;

    // Remove existing tags and filters
    removeTags(el);
    el.style.removeProperty('opacity');
    el.style.removeProperty('max-height');
    el.style.removeProperty('overflow');
    el.style.removeProperty('margin');
    el.style.removeProperty('padding');
    delete el.dataset.fcDimmed;

    // Remove hidden summary bars
    const prev = el.previousElementSibling;
    if (prev?.classList.contains('fc-hidden-summary')) {
      prev.remove();
    }

    // Re-apply if we have cached result
    if (tweetId) {
      const cached = resultCache.get(tweetId);
      if (cached) {
        if (settings.showTags) {
          applyTags(el, cached);
        }
        applyFilter(el, cached, settings);
      }
    }
  });

  // Recount stats
  sessionStats.postsFiltered = 0;
  sessionStats.postsDimmed = 0;
  sessionStats.postsByCategory = { ad: 0, ai: 0, bait: 0, bot: 0, lowEffort: 0 };

  for (const [, result] of resultCache) {
    for (const flag of result.flags) {
      sessionStats.postsByCategory[flag.category]++;
    }
  }
}

// ── Stats Reporting ───────────────────────────────────────────

function reportStats() {
  try {
    chrome.runtime.sendMessage({
      type: 'RECORD_STATS',
      payload: sessionStats,
    }).catch(() => {});
  } catch { /* extension context may be invalidated */ }
}

// ── Start ─────────────────────────────────────────────────────

init();
