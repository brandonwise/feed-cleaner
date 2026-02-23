# Feed Cleaner — Architecture

## Product Vision
A Chrome extension that transforms your X/Twitter feed from a firehose of AI slop into a curated stream of genuine, valuable content. Users should feel like they got a new feed — cleaner, smarter, and deeply satisfying.

## The "Blow Them Away" Principles
1. **Instant value** — first 10 seconds of use, you see scored posts
2. **Transparent** — every score is explainable, never a black box
3. **Beautiful** — the UI itself is a selling point
4. **Quantified** — hard numbers on time saved and quality improved
5. **Shareable** — feed health scores and stats that people WANT to post

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Chrome Extension                   │
├──────────┬──────────┬───────────┬───────────────────┤
│ Content  │ Popup    │ Dashboard │ Background        │
│ Script   │ (Quick)  │ (Full)    │ Service Worker    │
├──────────┴──────────┴───────────┴───────────────────┤
│              Detection Engine (Core)                 │
│  ┌──────────┬──────────┬──────────┬──────────────┐  │
│  │ AI Slop  │ Engage-  │ Bot/Farm │ Originality  │  │
│  │ Detector │ ment     │ Detector │ Scorer       │  │
│  │          │ Bait     │          │              │  │
│  └──────────┴──────────┴──────────┴──────────────┘  │
├─────────────────────────────────────────────────────┤
│              Storage Layer                           │
│  ┌──────────┬──────────┬──────────────────────────┐ │
│  │ Post     │ Account  │ User Prefs & Rules       │ │
│  │ Scores   │ Profiles │                          │ │
│  └──────────┴──────────┴──────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Components

### 1. Detection Engine (`src/detection/`)
The brain — ports and extends Humanizer's analysis:

**AI Content Detection** (`ai-detector.ts`)
- 24 linguistic patterns from Humanizer
- 500+ AI vocabulary terms (delve, tapestry, leverage, etc.)
- Statistical analysis: burstiness, TTR, Flesch-Kincaid
- Sentence structure uniformity detection
- Hedging/qualifier density
- Adapted for short-form (tweets are different from articles)

**Engagement Bait Detection** (`bait-detector.ts`)
- Hook pattern matching ("You won't believe", "Thread 🧵", "Here's what nobody tells you")
- Rage bait signals (outrage words, polarizing framing)
- FOMO triggers ("Last chance", "Before it's too late")
- Empty promise patterns ("How I made $X in Y days")
- Listicle abuse ("10 things that will change your life")

**Bot/Farm Detection** (`bot-detector.ts`)
- Posting frequency analysis (>20 posts/day = suspicious)
- Follower/following ratio
- Account age vs activity level
- Reply pattern analysis (generic replies, no context)
- Profile completeness signals

**Originality Scoring** (`originality-scorer.ts`)
- Duplicate content detection (seen-before hashing)
- Quote-tweet-without-commentary detection
- Recycled thread detection (same structure, different topic)
- Cross-reference with previously seen content

**Master Scorer** (`scorer.ts`)
- Weighted combination of all detectors
- Per-post quality score: 0-100
- Category breakdown: AI (0-100), Bait (0-100), Bot (0-100), Original (0-100)
- Overall grade: A/B/C/D/F with color coding
- Configurable weights per user preference

### 2. Content Script (`src/content/`)
Injects into X/Twitter pages:

**Post Scanner** (`scanner.ts`)
- MutationObserver watching for new tweets in feed
- Extracts text, author info, engagement metrics
- Runs detection engine on each post
- Caches results per tweet ID

**Visual Overlay** (`overlay.ts`)
- Quality halo: subtle colored border on each tweet
  - Green (A/B): genuine, high quality
  - Amber (C): mixed signals, proceed with caution
  - Red (D/F): likely AI slop / engagement bait
- Score badge: small pill showing score (e.g., "87" in green)
- Click badge → expand detail panel showing breakdown
- Smooth animations, not jarring

**Filter Engine** (`filter.ts`)
- Three modes:
  - **Highlight**: Color-code only, hide nothing
  - **Dim**: Low-quality posts fade to 20% opacity
  - **Clean**: Low-quality posts removed entirely
- Quality threshold slider (0-100, default 40)
- Per-category toggles (filter AI, filter bait, filter bots independently)
- Always-show whitelist (never filter these accounts)
- Always-hide blacklist

**Gem Highlighter** (`gems.ts`)
- Posts scoring 85+ get special treatment
- Subtle golden glow + "Gem 💎" badge
- These are the posts worth reading — make them pop

### 3. Popup (`src/popup/`)
Quick access when clicking extension icon:

- Current session stats (posts scanned, filtered, time saved)
- Quick mode toggle (Highlight / Dim / Clean)
- Threshold slider
- Link to full dashboard
- "Share my feed score" button

### 4. Dashboard (`src/dashboard/`)
Full analytics page (opens in new tab):

**Overview**
- Feed Health Score (0-100, updated daily)
- Posts scanned today / this week / all time
- Posts filtered (count + percentage)
- Estimated time saved (based on avg reading time per filtered post)
- Quality trend chart (is your feed getting better or worse?)

**Account Audit**
- Table of accounts you interact with, sorted by quality score
- "Your worst follows" — accounts with highest AI/bait scores
- "Your best follows" — accounts with highest originality
- Unfollow suggestions with reasoning

**Detection Breakdown**
- Pie chart: what types of content are being filtered
- AI content %, engagement bait %, bot content %, low originality %
- Trending patterns (e.g., "AI content in your feed increased 23% this week")

**History**
- Scrollable log of filtered posts with scores
- Click to see original post + breakdown
- "Oops" button — mark false positives to improve detection

### 5. Background Service Worker (`src/background/`)

**Stats Aggregator** (`stats.ts`)
- Aggregates per-session, daily, weekly stats
- Stores in chrome.storage.local
- Computes derived metrics (time saved, quality trends)

**Account Profiler** (`profiler.ts`)
- Builds quality profiles for accounts over time
- Running average of post scores per author
- Confidence increases with more observed posts

**Settings Manager** (`settings.ts`)
- User preferences, mode, threshold, whitelist/blacklist
- Sync across devices via chrome.storage.sync

### 6. UI Components (`src/ui/`)
Shared design system:

- Color palette: clean, modern, dark-mode aware
- Score badge component
- Detail panel component
- Chart components (for dashboard)
- Toast notifications
- Consistent with X's visual language (don't look foreign)

## Tech Stack
- **TypeScript** — type safety throughout
- **Vite** — fast builds with Chrome extension support
- **React** — dashboard and popup (lightweight)
- **Tailwind CSS** — styling
- **Chrome Extension Manifest V3**
- **chrome.storage** — local + sync storage
- **No external dependencies at runtime** — everything runs locally, no API calls, no data leaves the browser

## Privacy
- **Zero data collection** — all analysis happens locally in the browser
- **No API calls** — detection engine runs entirely client-side
- **No tracking** — we never see your feed, your scores, or your data
- This is a FEATURE, not just compliance. Market it hard.

## Monetization
- **Free tier**: Highlight mode only, basic stats, 3 account audits
- **Pro ($4.99/mo or $39.99/yr)**: All modes, full dashboard, unlimited audits, custom rules, export data
- **Payment**: Stripe Checkout via simple landing page
- **License key**: Entered in extension settings, validated locally

## File Structure
```
feed-cleaner/
├── manifest.json
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── src/
│   ├── detection/
│   │   ├── ai-detector.ts
│   │   ├── bait-detector.ts
│   │   ├── bot-detector.ts
│   │   ├── originality-scorer.ts
│   │   ├── scorer.ts
│   │   ├── patterns.ts        # All detection patterns/vocab
│   │   └── types.ts
│   ├── content/
│   │   ├── index.ts            # Entry point, MutationObserver
│   │   ├── scanner.ts
│   │   ├── overlay.ts
│   │   ├── filter.ts
│   │   └── gems.ts
│   ├── popup/
│   │   ├── index.html
│   │   ├── Popup.tsx
│   │   └── main.tsx
│   ├── dashboard/
│   │   ├── index.html
│   │   ├── Dashboard.tsx
│   │   ├── Overview.tsx
│   │   ├── AccountAudit.tsx
│   │   ├── DetectionBreakdown.tsx
│   │   ├── History.tsx
│   │   └── main.tsx
│   ├── background/
│   │   ├── index.ts
│   │   ├── stats.ts
│   │   ├── profiler.ts
│   │   └── settings.ts
│   ├── ui/
│   │   ├── ScoreBadge.tsx
│   │   ├── DetailPanel.tsx
│   │   ├── QualityHalo.tsx
│   │   ├── ThresholdSlider.tsx
│   │   └── theme.ts
│   └── shared/
│       ├── constants.ts
│       ├── storage.ts
│       └── types.ts
├── assets/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── landing/                    # Simple landing page for marketing
    ├── index.html
    └── styles.css
```

## Launch Plan
1. Chrome Web Store (free tier)
2. Landing page with before/after screenshots
3. X thread showing the extension in action
4. Post in r/Twitter, r/ChatGPT, r/artificial, r/chrome
5. Product Hunt launch (week 2)
6. Enable Pro tier after 100 free users validate product-market fit
