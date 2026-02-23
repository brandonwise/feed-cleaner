// Feed Cleaner — Content Script Entry Point
// Observes the X/Twitter feed and scores every tweet in real-time

import { extractTweet, scoreTweet } from './scanner';
import { applyOverlay, removeOverlay } from './overlay';
import { applyFilter, showFilteredSummary } from './filter';
import { getSettings } from '../shared/storage';
import type { UserSettings, PostScore, SessionStats } from '../shared/types';
import { DEFAULT_SETTINGS, AVG_READ_TIME_SECONDS } from '../shared/constants';

// ── State ─────────────────────────────────────────────────────

let settings: UserSettings = DEFAULT_SETTINGS;
let sessionStats: SessionStats = {
  postsScanned: 0,
  postsFiltered: 0,
  postsDimmed: 0,
  gemsFound: 0,
  sessionStart: Date.now(),
  avgFeedScore: 0,
  scoreSum: 0,
};

const processedTweets = new Set<string>();
const scoreCache = new Map<string, PostScore>();

// ── Initialization ────────────────────────────────────────────

async function init(): Promise<void> {
  console.log('[Feed Cleaner] 🧹 Initializing...');

  // Load settings
  try {
    settings = await getSettings();
  } catch {
    // Content scripts may not have full chrome.storage access immediately
    console.log('[Feed Cleaner] Using default settings');
    settings = DEFAULT_SETTINGS;
  }

  // Listen for settings updates from popup/background
  chrome.runtime?.onMessage?.addListener((msg) => {
    if (msg.type === 'SETTINGS_UPDATED') {
      settings = { ...settings, ...msg.payload };
      reprocessAllTweets();
    }
    if (msg.type === 'GET_SESSION_STATS') {
      chrome.runtime.sendMessage({
        type: 'SESSION_STATS',
        payload: sessionStats,
      });
    }
  });

  // Start observing
  observeFeed();

  // Process any tweets already on the page
  processExistingTweets();

  console.log(`[Feed Cleaner] ✅ Active — Mode: ${settings.mode}, Threshold: ${settings.threshold}`);
}

// ── Feed Observer ─────────────────────────────────────────────

function observeFeed(): void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          // Check if this node is a tweet article or contains tweet articles
          const articles = node.matches('article[data-testid="tweet"]')
            ? [node]
            : Array.from(node.querySelectorAll('article[data-testid="tweet"]'));

          for (const article of articles) {
            processTweet(article as HTMLElement);
          }
        }
      }
    }
  });

  // Observe the main timeline container
  // X uses different containers, so observe the whole body with subtree
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function processExistingTweets(): void {
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  articles.forEach(article => processTweet(article as HTMLElement));
}

// ── Tweet Processing ──────────────────────────────────────────

function processTweet(article: HTMLElement): void {
  const tweet = extractTweet(article);
  if (!tweet) return;

  // Skip if already processed
  if (processedTweets.has(tweet.tweetId)) {
    // Re-apply overlay in case DOM was recycled
    const cached = scoreCache.get(tweet.tweetId);
    if (cached) {
      applyOverlay(article, cached, settings.showScoreBadge, settings.showGems);
      applyFilter(article, cached, settings);
    }
    return;
  }

  processedTweets.add(tweet.tweetId);

  // Score the tweet
  const score = scoreTweet(tweet);
  scoreCache.set(tweet.tweetId, score);

  // Update stats
  sessionStats.postsScanned++;
  sessionStats.scoreSum += score.overallScore;
  sessionStats.avgFeedScore = Math.round(sessionStats.scoreSum / sessionStats.postsScanned);

  if (score.isGem) {
    sessionStats.gemsFound++;
  }

  // Apply visual overlay
  applyOverlay(article, score, settings.showScoreBadge, settings.showGems);

  // Apply filtering
  const filterResult = applyFilter(article, score, settings);

  if (filterResult === 'hidden') {
    sessionStats.postsFiltered++;

    // In clean mode, show a summary bar for filtered posts
    if (settings.mode === 'clean') {
      showFilteredSummary(article, score, () => {
        sessionStats.postsFiltered--;
        reportStats();
      });
    }
  } else if (filterResult === 'dimmed') {
    sessionStats.postsDimmed++;
  }

  // Report stats periodically
  if (sessionStats.postsScanned % 10 === 0) {
    reportStats();
  }
}

// ── Reprocessing ──────────────────────────────────────────────

function reprocessAllTweets(): void {
  // Reset filter state
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  articles.forEach(article => {
    const el = article as HTMLElement;
    const tweetId = el.dataset.fcScored;
    if (tweetId) {
      removeOverlay(el);
      const cached = scoreCache.get(tweetId);
      if (cached) {
        applyOverlay(el, cached, settings.showScoreBadge, settings.showGems);
        applyFilter(el, cached, settings);
      }
    }
  });
}

// ── Stats Reporting ───────────────────────────────────────────

function reportStats(): void {
  try {
    chrome.runtime?.sendMessage({
      type: 'RECORD_STATS',
      payload: {
        ...sessionStats,
        estimatedMinutesSaved: Math.round(
          (sessionStats.postsFiltered * AVG_READ_TIME_SECONDS) / 60
        ),
      },
    });
  } catch {
    // Background may not be ready
  }
}

// ── Start ─────────────────────────────────────────────────────

// Wait for page to be interactive
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
