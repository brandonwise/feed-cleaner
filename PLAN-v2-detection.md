# Feed Cleaner v2 — Detection Overhaul Plan

## The Problem

v1's approach doesn't work in practice. Here's why:

### Why v1 Fails
1. **Text analysis is useless on short tweets.** Most tweets are 5-30 words. Statistical measures (burstiness, TTR, Flesch-Kincaid) need 100+ words to be meaningful. On a 10-word tweet, every metric returns "inconclusive."
2. **Absence of bad signals ≠ good content.** v1 scores quality as `100 - bad_signals`. A generic nothing-tweet with no AI vocab, no bait patterns, no bot signals scores 85+. The model can't distinguish "genuine insight" from "nothing to detect."
3. **Single score blurs categories.** "AI slop", "promoted ad", "engagement bait", and "low effort" are completely different problems. Blending them into one 0-100 number means you can't filter one without catching the others.
4. **No DOM awareness.** X literally labels promoted content, shows "Ad" badges, marks verified organizations. We ignore all of it and try to guess from text alone.
5. **No account context.** A tweet from a news org, a brand account, and your friend should be evaluated differently. We treat them identically.

### What Users Actually Want
- **Hide ads and promoted content** (most requested — 100% detectable from DOM)
- **Flag AI-generated threads/takes** (the LinkedIn-brain stuff flooding X)
- **Reduce engagement bait** (rage farming, empty hot takes, "like if you agree")
- **Surface genuinely interesting content** (the needle in the haystack)

---

## v2 Architecture: Category-Based Detection

Instead of one scorer → one number, v2 uses **independent detectors that each produce a binary flag + confidence**. The UI shows which categories triggered, and the user controls which categories to act on.

### Detection Categories

#### 1. 🏷️ ADS & PROMOTED (DOM-based — near 100% accuracy)
**Approach:** Read X's own DOM markers. Zero text analysis needed.

**Signals (from DOM):**
- `[data-testid="placementTracking"]` — X's promoted tweet wrapper (may have changed)
- Text content containing "Promoted" or "Ad" in the social context area below tweets
- `article` ancestors with ad-related attributes
- "Promoted by [Brand]" text pattern in tweet footer area
- Sponsored content indicators: verified org badge (gold checkmark) + external link + short promotional text

**Signals (from content):**
- Links to product pages / app stores
- Brand account + product mention ("Try Grok Imagine" from @elonmusk = platform promo)
- CTA language: "Download", "Get started", "Sign up", "Try it free", "Use code"

**Action:** Auto-hide by default (user can toggle). Show "[Ad hidden]" placeholder.

#### 2. 🤖 AI-GENERATED CONTENT (text + structural patterns)
**Approach:** Don't try to be GPTZero. We can't run perplexity models in a content script. Instead, focus on the **structural patterns** that are dead giveaways on Twitter specifically.

**High-confidence signals (worth 15-25 points each):**
- **Numbered list threads:** "🧵 Here are 10 things..." / "1/ ... 2/ ... 3/ ..."
- **Emoji-header format:** "🔥 Bold claim\n\n✅ Point one\n✅ Point two" (the LinkedIn-to-Twitter pipeline)
- **AI vocabulary clusters:** 3+ AI words in one tweet (single AI word = noise, cluster = signal)
- **Perfect parallel structure:** "X isn't about Y. It's about Z." repeated patterns
- **Formulaic thread starters:** "I studied X for Y hours. Here's what I learned:"
- **Suspiciously comprehensive:** Tweet covers 5+ subtopics with bullet points in 280 chars

**Medium-confidence signals (worth 5-10 points each):**
- **Excessive hedging + resolution:** "While X may seem Y, the reality is Z"
- **Listicle format in a single tweet:** Using • or - for 4+ bullet points
- **Generic inspirational close:** "The future belongs to those who..."
- **AI vocabulary (1-2 words):** "delve", "tapestry", "leverage", "landscape", "harness", "embark"

**Low-confidence signals (worth 1-3 points each):**
- **High formality in casual context:** Semicolons, em-dashes, "Furthermore" in a reply
- **No contractions:** "It is" instead of "it's", "do not" instead of "don't" — unusual in tweets
- **Overly balanced:** "On one hand... on the other hand..." in 280 chars

**Threshold:** Flag at 30+ points (means at least one high-confidence or several medium signals).

**Key insight:** We're NOT trying to catch all AI content. We're catching the *lazy* AI content — the stuff that's obviously template-generated. Well-edited AI content that reads naturally? That's fine. The user experience problem is the *slop*, not the tool.

#### 3. 🎣 ENGAGEMENT BAIT (pattern matching — high accuracy)
**Approach:** These patterns are extremely consistent and regex-able.

**Auto-flag patterns:**
- **Rage bait:** "Nobody is talking about this", "Why is no one upset about"
- **False urgency:** "BREAKING:", "🚨", "JUST IN:" (from non-news accounts)
- **Reply farming:** "What's your [X]?", "Wrong answers only", "Unpopular opinion:"
- **Engagement manipulation:** "Like if you agree", "RT if you", "Follow for more"
- **Cliffhanger bait:** "Wait for it...", "You won't believe what happened next"
- **Manufactured controversy:** "Hot take:", "Controversial opinion:", stated as a hook not content
- **Flex/humble brag:** "I just [achievement] and here's what I learned" (when the point is the flex, not the lesson)
- **Vague teasing:** "Big announcement coming soon 👀", "Something exciting is happening"

**From non-text signals:**
- **Ratio of questions to statements:** 3+ questions in a tweet = farming replies
- **Quote tweet with no commentary:** Just "This." or "💯" or "👆" = low effort engagement
- **Thread with each tweet being one sentence:** Artificially inflating tweet count

#### 4. 🤖 BOT/FARM (account behavioral patterns)
**Approach:** Use what we can observe from the DOM about the account.

**Observable from DOM:**
- **Account age vs follower count:** Visible in profile hover cards
- **Handle pattern:** Random chars, numbers-heavy (`@user8374829`)
- **Display name patterns:** Emoji-stuffed names, generic motivational names
- **Blue checkmark (paid) + low engagement:** Bought verification, no real audience
- **Identical posting pattern:** Same format tweet appearing multiple times in feed

**From content patterns:**
- **Template tweets:** "[Topic] is not about [X]. It's about [Y]." — the fill-in-the-blank format
- **Crypto/trading spam signals:** 🚀📈💰 clusters, "100x", "$TICKER to the moon"
- **Dropship/affiliate spam:** Multiple product links, discount codes, "link in bio"

#### 5. 📉 LOW EFFORT (content quality — supplementary)
**Approach:** This is the catch-all for content that isn't bad per se, but adds no value.

**Signals:**
- **< 5 words, no media, not a reply:** Just noise
- **Pure emoji tweet:** 😂😂😂💀 (as an original tweet, not reply)
- **Retweet with zero commentary** 
- **"Ratio" / single-word dunks**
- **Link-only tweets** (just a URL, no context)

**This category should be OFF by default.** It's opinionated and some users want casual content.

---

## UI Changes

### Replace Single Score with Category Tags

**Current (broken):**
```
[A 93] ← single score badge
```

**v2:**
```
[🏷️ Ad] [🤖 AI] [🎣 Bait]  ← category tags, only shown when flagged
```

Each tag is color-coded:
- 🏷️ Ad → gray background (neutral — it's just an ad)
- 🤖 AI → purple background (distinctive)  
- 🎣 Bait → orange background (warning)
- 🤖 Bot → red background (danger)
- 📉 Low → dim gray (subtle)

### Replace Threshold Slider with Category Toggles

**Current (broken):**
```
QUALITY THRESHOLD: [====|====] 80
```

**v2:**
```
FILTER RULES:
  🏷️ Ads & Promoted    [Hide ▼]  ← dropdown: Show / Dim / Hide
  🤖 AI Generated       [Dim  ▼]
  🎣 Engagement Bait    [Dim  ▼]
  🤖 Bot/Farm           [Hide ▼]
  📉 Low Effort         [Show ▼]  ← off by default
```

Each category independently controllable: Show (no action), Dim (reduce opacity), Hide (collapse).

### Popup Stats Become Category-Based

**Current:**
```
50 Scanned | 0 Filtered | 90/100 Feed Score
```

**v2:**
```
50 Scanned | 12 Filtered
  🏷️ 3 Ads hidden
  🤖 5 AI flagged  
  🎣 4 Bait dimmed
```

### Detail Panel (click to expand)

When user clicks a category tag on a tweet:
```
┌─────────────────────────────────────────┐
│ 🤖 AI Generated (High Confidence)       │
│                                          │
│ 🔴 Emoji-header format (+20)            │
│    "🔥 ... ✅ ... ✅ ..." structure      │
│ 🟡 AI vocabulary cluster (+8)           │
│    Found: "landscape", "leverage",       │
│    "harness"                             │
│ 🟡 No contractions (+5)                 │
│    Formal tone unusual for tweets        │
│                                          │
│ Total confidence: 33/100                 │
│                                     [OK] │
└─────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: DOM-Based Ad Detection (1 hour)
**Highest impact, easiest to build.**
- [ ] New detector: `src/detection/ad-detector.ts`
- [ ] Query DOM for promoted/ad markers on each article element
- [ ] Pass the `HTMLElement` (not just text) to detection pipeline
- [ ] Text pattern matching for promotional CTAs
- [ ] Default action: auto-hide with "[Ad hidden]" placeholder

### Phase 2: Rewrite AI Detector for Tweets (2 hours)
**Throw away the article-focused v1 detector. Rebuild for short text.**
- [ ] New pattern set focused on Twitter-specific AI slop formats
- [ ] Structural detection: numbered lists, emoji headers, parallel structure
- [ ] Vocabulary clustering (require 3+ AI words, not 1)
- [ ] Remove useless metrics: burstiness, TTR, FK for < 50 words
- [ ] Thread detection: scan the visible thread, not individual tweets

### Phase 3: Engagement Bait Detector v2 (1 hour)
**Expand patterns significantly.**
- [ ] Add 20+ new bait patterns from real X observation
- [ ] Quote-tweet-without-commentary detection
- [ ] Reply farming detection (multiple questions, no substance)
- [ ] "BREAKING" from non-news accounts

### Phase 4: UI Overhaul (2 hours)
**Category tags instead of single score.**
- [ ] New `CategoryTag` component replacing `ScoreBadge`
- [ ] Per-category filter controls in popup (Show/Dim/Hide dropdowns)
- [ ] Category-based stats in popup
- [ ] Updated detail panel showing flag breakdown per category
- [ ] Updated dashboard with per-category analytics

### Phase 5: Bot/Farm + Low Effort (1 hour)
**Lower priority — add if time permits.**
- [ ] Bot handle/name pattern detection
- [ ] Template tweet format detection
- [ ] Low effort signals (< 5 words, emoji-only, link-only)

### Phase 6: Polish & Test (1 hour)
- [ ] Test on live X.com feed
- [ ] Tune confidence thresholds based on real data
- [ ] Update tests
- [ ] Update README / landing page

---

## Key Design Decisions

### 1. Pass HTMLElement to detectors, not just text
v1 extracted text and threw away the element. v2 passes the DOM element so detectors can check for promoted labels, verification badges, embedded cards, etc.

### 2. Category flags, not quality scores
Binary "flagged or not" per category (with a confidence %). No single composite score. The user doesn't need to understand what "73/100" means — they need to know "this is an ad" or "this looks AI-generated."

### 3. Ads are the killer feature
Ad detection is **100% accurate** (X marks them in the DOM), **universally wanted** (everyone hates feed ads), and **immediately visible** (user sees the extension doing something useful on first load). This should be Phase 1 and the hero feature.

### 4. AI detection is probabilistic, and that's OK
We can't be GPTZero without a language model. But we CAN catch the 60-70% of AI slop that follows obvious structural patterns. Frame it as "AI Pattern Detection" not "AI Detector" — manage expectations.

### 5. Conservative defaults
- Ads: Hide
- AI: Dim (not hide — could be wrong)
- Bait: Dim  
- Bot: Hide
- Low Effort: Show (off by default)

Users should see value immediately but not feel like content is being censored.

---

## Technical Notes

### Scanner Changes
```typescript
// v1: only extracted text
interface TweetData {
  text: string;
  authorHandle: string;
}

// v2: preserves DOM reference + extracts more metadata
interface TweetData {
  element: HTMLElement;           // the article element
  text: string;
  authorHandle: string;
  authorDisplayName: string;
  isVerified: boolean;
  isVerifiedOrg: boolean;        // gold checkmark (brand)
  isPromoted: boolean;           // DOM says it's an ad
  isQuoteTweet: boolean;
  quotedText: string | null;     // text of the quoted tweet
  isReply: boolean;
  isThread: boolean;             // part of a thread from same author
  hasMedia: boolean;
  hasExternalLink: boolean;
  linkDomain: string | null;     // extracted domain from link
  tweetAge: string | null;       // "2h", "11d", etc from timestamp
}
```

### Detection Pipeline
```typescript
// v1: single scorer
const score = scoreTweet(tweet); // → { overallScore: 93 }

// v2: multi-detector pipeline
const flags = detectAll(tweet);
// → [
//   { category: 'ad', confidence: 100, reason: 'DOM promoted label' },
//   { category: 'bait', confidence: 72, signals: [...] }
// ]
// Tweet can have 0, 1, or multiple flags
```

### Storage
```typescript
// v2 settings
interface FilterSettings {
  ads: 'show' | 'dim' | 'hide';        // default: 'hide'
  aiGenerated: 'show' | 'dim' | 'hide'; // default: 'dim'
  bait: 'show' | 'dim' | 'hide';        // default: 'dim'
  botFarm: 'show' | 'dim' | 'hide';     // default: 'hide'
  lowEffort: 'show' | 'dim' | 'hide';   // default: 'show'
}
```

---

## Success Criteria

After v2, when a user loads X.com with Feed Cleaner installed:
1. **Promoted tweets are immediately hidden** with a small "[Ad hidden]" bar
2. **AI slop threads get a purple 🤖 tag** and are dimmed
3. **Engagement bait gets an orange 🎣 tag** and is dimmed
4. **Normal human tweets are untouched** — no score badge, no halo, nothing
5. **Popup shows meaningful stats:** "12 ads hidden, 5 AI posts flagged, 4 bait posts dimmed"
6. **User can customize per-category** without understanding a threshold slider

## Estimated Total: ~8 hours

Priority order: Ads (1h) → UI (2h) → AI (2h) → Bait (1h) → Bot (1h) → Polish (1h)

Ads + UI alone would make the extension feel dramatically more useful than v1.
