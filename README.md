# 🧹 Feed Cleaner — AI Content Filter for X/Twitter

**Transform your X feed. Filter AI slop, engagement bait, and bot content. See what's real.**

[![Tests](https://img.shields.io/badge/tests-40%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)]()
[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-orange)]()
[![Privacy](https://img.shields.io/badge/privacy-100%25%20local-green)]()

---

## What It Does

Feed Cleaner scores every post on your X timeline across 4 dimensions:

| Detector | What It Catches |
|----------|----------------|
| 🤖 **AI Content** | 24 linguistic patterns, 500+ vocabulary signals, sentence uniformity, readability analysis |
| 🎣 **Engagement Bait** | Shock hooks, rage bait, FOMO triggers, engagement farming, hashtag stuffing |
| 🤖 **Bot/Farm** | Generic replies, blue-check reply hijacks, mention spray spam, template posts |
| 💎 **Originality** | Personal experience, technical depth, vocabulary richness, natural writing rhythm |

Posts get graded A through F with full transparency — click any score to see exactly why.

## Features

- **Three Filter Modes**: Highlight (color-code), Dim (fade low quality), Clean (remove entirely)
- **Quality Threshold Slider**: Set your own standards
- **Gem Detection**: High-quality posts get a 💎 badge so you don't miss them
- **Detail Breakdown**: Click any score for a full analysis with color-coded category bars
- **Session Stats**: Posts scanned, filtered, time saved — right in the popup
- **Account Audit Dashboard**: See your best and worst follows ranked by content quality
- **Share Your Score**: Copy your feed health score and share it
- **Reply Hijack Detection**: Catches low-value "great post, check my bio" reply spam (including verified pitch accounts)

## Privacy

**100% local. Always.**

- All analysis runs in your browser — zero API calls
- We never see your feed, your scores, or your data
- No tracking, no analytics, no telemetry
- No account required

## Install

### From Chrome Web Store
*(Coming soon)*

### Manual (Developer Mode)
1. Clone this repo
2. `npm install && npm run build`
3. Open `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" → select the `dist/` folder

## Development

```bash
npm install
npm run dev          # Vite dev server
npm run build        # Production build
npx vitest run       # Run tests (40 passing)
npx tsc --noEmit     # Type check
```

## Detection Engine

The detection engine is adapted from [Humanizer](https://github.com/brandonwise/humanizer), extended for social media:

- **Text Statistics**: Flesch-Kincaid readability, burstiness (sentence length variance), type-token ratio
- **Pattern Matching**: 100+ regex patterns across AI vocabulary, bait hooks, bot behaviors
- **Weighted Scoring**: Each detector contributes to a weighted overall score (configurable)
- **Confidence Scaling**: Short texts get lower confidence to avoid false positives

## Architecture

```
src/
├── detection/          # Core scoring engine
│   ├── ai-detector     # AI content detection (Humanizer port)
│   ├── bait-detector   # Engagement bait patterns
│   ├── bot-detector    # Bot/farm account signals
│   ├── originality     # Quality/originality scoring
│   ├── scorer          # Master scorer combining all detectors
│   ├── text-stats      # Statistical text analysis
│   └── patterns        # All detection patterns and vocabulary
├── content/            # Content script (injected into X)
│   ├── scanner         # DOM observation and tweet extraction
│   ├── overlay         # Visual indicators (halos, badges, panels)
│   └── filter          # Highlight/dim/clean filter logic
├── popup/              # Extension popup UI
├── dashboard/          # Full analytics dashboard
├── background/         # Service worker (stats, settings)
└── shared/             # Types, constants, storage helpers
```

## Stats

- **2,600+ lines** of TypeScript
- **40 tests** passing
- **100+ detection patterns**
- **500+ AI vocabulary terms**
- **Zero runtime dependencies** (React only for popup/dashboard UI)

## License

MIT

## Author

Built by [@brandonwise](https://github.com/brandonwise)
