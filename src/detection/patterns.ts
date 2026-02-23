// Feed Cleaner — Detection Patterns
// Ported from Humanizer + extended for social media context

// ═══════════════════════════════════════════════════════════════
// AI VOCABULARY — words that flag AI-generated content
// ═══════════════════════════════════════════════════════════════

export const AI_VOCABULARY: readonly string[] = [
  // Tier 1: Dead giveaways (almost never used by humans in casual writing)
  'delve', 'tapestry', 'multifaceted', 'nuanced', 'paradigm',
  'synergy', 'holistic', 'leveraging', 'groundbreaking', 'transformative',
  'spearheading', 'underpinning', 'underscores', 'navigating', 'fostering',
  'paramount', 'encompasses', 'facilitating', 'comprehensive', 'intricate',
  'pivotal', 'commendable', 'noteworthy', 'invaluable', 'indispensable',

  // Tier 2: Suspicious in combination
  'realm', 'landscape', 'ecosystem', 'framework', 'cornerstone',
  'catalyst', 'endeavor', 'embark', 'cultivate', 'harness',
  'bolster', 'forge', 'propel', 'empower', 'streamline',
  'optimize', 'revolutionize', 'reimagine', 'amplify', 'elevate',
  'resonate', 'illuminating', 'compelling', 'robust', 'seamless',
  'cutting-edge', 'state-of-the-art', 'best-in-class', 'world-class',

  // Tier 3: AI filler phrases (partial match)
  'it\'s worth noting', 'it\'s important to note', 'in today\'s',
  'in the realm of', 'at its core', 'by and large', 'in essence',
  'it goes without saying', 'needless to say', 'to put it simply',
  'when it comes to', 'in the grand scheme', 'all things considered',

  // Tier 4: AI-typical transitions
  'moreover', 'furthermore', 'additionally', 'consequently',
  'nevertheless', 'notwithstanding', 'henceforth', 'thereby',

  // Tier 5: AI hedging
  'arguably', 'ostensibly', 'purportedly', 'seemingly',
  'it could be argued', 'one might say', 'it bears mentioning',
] as const;

// Weight tiers for scoring
export const AI_VOCAB_WEIGHTS: Record<string, number> = {};
AI_VOCABULARY.forEach((word, i) => {
  if (i < 25) AI_VOCAB_WEIGHTS[word.toLowerCase()] = 5;      // Tier 1
  else if (i < 53) AI_VOCAB_WEIGHTS[word.toLowerCase()] = 3;  // Tier 2
  else if (i < 66) AI_VOCAB_WEIGHTS[word.toLowerCase()] = 4;  // Tier 3 (phrases are strong signals)
  else if (i < 74) AI_VOCAB_WEIGHTS[word.toLowerCase()] = 2;  // Tier 4
  else AI_VOCAB_WEIGHTS[word.toLowerCase()] = 3;               // Tier 5
});

// ═══════════════════════════════════════════════════════════════
// AI STRUCTURAL PATTERNS
// ═══════════════════════════════════════════════════════════════

export const AI_STRUCTURAL_PATTERNS = [
  {
    name: 'emoji_header_list',
    description: 'Emoji + bold header + numbered list (classic ChatGPT format)',
    pattern: /(?:[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}])\s*\*?\*?[A-Z][^*\n]{3,}\*?\*?\s*(?:\n|$)(?:\d+\.|[-•])/u,
    weight: 8,
  },
  {
    name: 'uniform_sentence_length',
    description: 'All sentences suspiciously similar length',
    // Detected programmatically, not via regex
    pattern: null,
    weight: 6,
  },
  {
    name: 'triple_structure',
    description: 'Lists of exactly 3 items repeatedly',
    pattern: /(?:(?:first|1\))[^.]+\.?\s*(?:second|2\))[^.]+\.?\s*(?:third|3\)))/i,
    weight: 4,
  },
  {
    name: 'colon_definition',
    description: 'Term: Definition pattern repeated',
    pattern: /(?:\*\*[^*]+\*\*:\s+[A-Z].*\n){2,}/,
    weight: 5,
  },
  {
    name: 'summary_closing',
    description: 'Closes with generic summary/call-to-action',
    pattern: /(?:in\s+(?:summary|conclusion)|(?:the\s+)?bottom\s+line|(?:key\s+)?takeaway|what\s+(?:are\s+)?your\s+thoughts)\s*[?:]/i,
    weight: 6,
  },
  {
    name: 'thread_opener',
    description: 'AI-style thread opener pattern',
    pattern: /^(?:🧵|thread[:\s]|here(?:'s|\s+is)\s+(?:what|why|how)\s)/i,
    weight: 3,
  },
] as const;

// ═══════════════════════════════════════════════════════════════
// ENGAGEMENT BAIT PATTERNS
// ═══════════════════════════════════════════════════════════════

export const BAIT_PATTERNS = [
  // Hook patterns — the "you won't believe" family
  {
    name: 'shock_hook',
    description: 'Shock/disbelief hook to drive clicks',
    pattern: /(?:you\s+won'?t\s+believe|this\s+(?:will\s+)?(?:blow|change)|nobody\s+(?:is\s+)?talk(?:s|ing)\s+about|what\s+(?:they|nobody)\s+(?:don'?t|won'?t)\s+tell\s+you|the\s+truth\s+(?:about|behind|is))/i,
    weight: 9,
  },
  {
    name: 'urgency_bait',
    description: 'False urgency to drive engagement',
    pattern: /(?:before\s+it'?s?\s+too\s+late|last\s+chance|don'?t\s+miss|act\s+(?:now|fast)|limited\s+time|this\s+won'?t\s+last|save\s+this\s+(?:before|now))/i,
    weight: 7,
  },
  {
    name: 'engagement_farming',
    description: 'Explicit engagement farming',
    pattern: /(?:(?:like|retweet|repost|follow|share)\s+(?:if\s+you|this\s+if|for\s+more)|(?:drop\s+a|comment)\s+(?:🔥|❤|👇|yes|no)|who(?:'s|\s+is)\s+with\s+me|rt\s+if\s+you\s+agree)/i,
    weight: 10,
  },
  {
    name: 'rage_bait',
    description: 'Designed to provoke outrage for engagement',
    pattern: /(?:(?:hot|unpopular|controversial)\s+take[:\s]|i\s+(?:don'?t\s+care|said\s+what\s+i\s+said)|let\s+that\s+sink\s+in|(?:nobody|no\s+one)\s+(?:is\s+)?ready\s+for\s+this)/i,
    weight: 8,
  },
  {
    name: 'fomo_numbers',
    description: 'Unrealistic number claims for FOMO',
    pattern: /(?:(?:how\s+)?i\s+(?:made|earned|generated)\s+\$[\d,]+k?\s+(?:in|with|from)|(?:\$[\d,]+k?\s+)?(?:per\s+)?(?:month|week|day|hour)|from\s+\$?\d+\s+to\s+\$[\d,]+k?)/i,
    weight: 7,
  },
  {
    name: 'empty_thread_promise',
    description: 'Thread promising massive value, usually empty',
    pattern: /(?:(?:here(?:'s|\s+(?:are|is)))\s+\d+\s+(?:things?|ways?|tips?|lessons?|secrets?|tools?|hacks?|mistakes?)\s+(?:that|to|about|for|i))|(?:a\s+thread\s*[🧵:])/i,
    weight: 6,
  },
  {
    name: 'cliffhanger',
    description: 'Artificial cliffhanger to drive replies',
    pattern: /(?:(?:but\s+)?here'?s?\s+(?:the\s+)?(?:thing|catch|twist|kicker|problem)|(?:ready\s+)?(?:for\s+)?the\s+(?:best|worst)\s+part|wait\s+(?:for\s+it|till\s+you\s+(?:hear|see)))/i,
    weight: 5,
  },
  {
    name: 'generic_motivation',
    description: 'Generic motivational content (low value)',
    pattern: /(?:(?:you\s+)?(?:can|will)\s+(?:do\s+)?(?:anything|this|it)|(?:believe\s+in\s+)?yourself|(?:never\s+)?(?:give\s+up|stop\s+(?:believing|trying))|(?:your\s+)?(?:only\s+)?limit\s+is\s+(?:your|you))/i,
    weight: 4,
  },
] as const;

// ═══════════════════════════════════════════════════════════════
// BOT/FARM PATTERNS
// ═══════════════════════════════════════════════════════════════

export const BOT_INDICATORS = {
  // Account-level signals (require author metadata)
  suspiciousFollowerRatio: {
    description: 'Following/follower ratio suggests bot or purchased followers',
    // > 10:1 following:followers = likely spam/bot
    // < 1:1000 followers:following = likely purchased
    weight: 6,
  },
  newAccountHighActivity: {
    description: 'Account less than 30 days old posting frequently',
    weight: 7,
  },
  // Content-level signals
  genericReply: {
    description: 'Generic reply that could apply to any post',
    patterns: [
      /^(?:great|amazing|love\s+this|so\s+true|this|facts|real|w\s+take|based|nice|wow|yes|100)[\s!.,🔥💯👏❤️🙌🎉😂]*(?:post|tweet|thread|take|point|one)?[\s!.,🔥💯👏❤️🙌🎉😂]*$/iu,
      /^(?:follow\s+(?:me|back)|check\s+(?:my|out)|link\s+in\s+bio)/i,
      /^(?:great\s+(?:post|tweet|thread|take|point|one))[!.\s]*[\u{1F300}-\u{1F9FF}]?$/iu,
    ],
    weight: 8,
  },
  templatePost: {
    description: 'Post follows obvious template structure',
    patterns: [
      /^(?:I\s+just|Just)\s+(?:published|posted|wrote|released|launched)/i,
    ],
    weight: 3,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// ORIGINALITY PATTERNS (negative signals)
// ═══════════════════════════════════════════════════════════════

export const LOW_ORIGINALITY_PATTERNS = [
  {
    name: 'quote_no_commentary',
    description: 'Quote tweet with no meaningful addition',
    pattern: /^(?:this[!.]*|👆|💯|facts?[!.]*|real[!.]*|say\s+it\s+louder|exactly|couldn'?t\s+(?:agree|have\s+said)\s+(?:more|it\s+better))\s*$/i,
    weight: 5,
  },
  {
    name: 'recycled_advice',
    description: 'Commonly recycled generic advice',
    pattern: /(?:(?:wake\s+up|start\s+(?:your\s+)?day)\s+(?:at\s+)?(?:4|5)\s*(?:am)?|(?:read|write)\s+(?:every|daily)|(?:cold\s+showers?|journal(?:ing)?|meditat(?:e|ion)|gratitude)\s+(?:changed|transform))/i,
    weight: 5,
  },
] as const;

// ═══════════════════════════════════════════════════════════════
// QUALITY SIGNALS (positive — these BOOST score)
// ═══════════════════════════════════════════════════════════════

export const QUALITY_SIGNALS = [
  {
    name: 'personal_experience',
    description: 'Specific personal anecdote with details',
    pattern: /(?:(?:when\s+)?i\s+(?:was\s+)?(?:working|building|trying|learning)|(?:at\s+)?my\s+(?:last|current|previous)\s+(?:job|company|startup)|(?:last\s+)?(?:week|month|year)\s+(?:i|we)\s+(?:shipped|built|launched|fixed))/i,
    weight: 4,
  },
  {
    name: 'specific_data',
    description: 'Includes specific data points or metrics',
    pattern: /(?:\d+(?:\.\d+)?%\s+(?:increase|decrease|growth|drop|improvement)|\d+\s+(?:users?|customers?|downloads?|sales|signups?)\s+(?:in|within|after))/i,
    weight: 3,
  },
  {
    name: 'original_insight',
    description: 'Contrarian or non-obvious take',
    pattern: /(?:(?:everyone|most\s+people)\s+(?:thinks?|says?|believes?)\s+(?:that\s+)?.*(?:but|however|actually)|unpopular(?:ly)?:\s+|counterintuitive(?:ly)?:\s+)/i,
    weight: 3,
  },
  {
    name: 'technical_depth',
    description: 'Contains technical specifics (code, architecture, numbers)',
    pattern: /(?:```|`[^`]+`|(?:we\s+)?(?:used|built\s+(?:with|using)|implemented|deployed)\s+(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)|(?:latency|throughput|QPS|TPS|p99|p95)\s+(?:is|was|went))/i,
    weight: 5,
  },
] as const;
