// AI Content Detector v2 — Twitter-specific structural patterns
// NOT trying to be GPTZero. Catches the obvious AI slop patterns on X.
import type { TweetData, CategoryFlag, Signal } from '../shared/types';

// Dead-giveaway AI vocabulary (only flag when clustered)
const AI_VOCAB = new Set([
  'delve', 'tapestry', 'leverage', 'landscape', 'harness', 'embark',
  'multifaceted', 'nuanced', 'paradigm', 'synergy', 'holistic',
  'transformative', 'groundbreaking', 'game-changer', 'game changer',
  'cutting-edge', 'cutting edge', 'revolutionary', 'innovative',
  'seamless', 'seamlessly', 'robust', 'empower', 'empowering',
  'navigate', 'navigating', 'foster', 'fostering', 'cultivate',
  'cultivating', 'elevate', 'elevating', 'unpack', 'unpacking',
  'unravel', 'unlock', 'unlocking', 'unleash', 'unleashing',
  'pivotal', 'crucial', 'essential', 'vital', 'paramount',
  'moreover', 'furthermore', 'nevertheless', 'consequently',
  'in conclusion', 'to summarize', 'it\'s worth noting',
  'it is worth noting', 'at the end of the day',
  'the reality is', 'the truth is', 'here\'s the thing',
  'let me be clear', 'make no mistake',
  'deep dive', 'double-edged sword', 'a testament to',
  'resonate', 'resonates', 'compelling', 'intriguing',
  'thought-provoking', 'insightful', 'invaluable',
]);

/**
 * Detect AI-generated content via structural patterns.
 * Focused on catching lazy AI slop, not well-edited AI content.
 */
export function detectAI(tweet: TweetData): CategoryFlag | null {
  const signals: Signal[] = [];
  const text = tweet.text;

  // ── HIGH confidence: Structural patterns (15-25 pts) ────────

  // Emoji-header format: "🔥 Title\n\n✅ Point 1\n✅ Point 2"
  if (/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]\s*[A-Z][^\n]{3,}\n(?:\s*[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u2705\u274C•\-]\s*[A-Z].*\n?){2,}/u.test(text)) {
    signals.push({
      name: 'emoji_header_format',
      label: 'AI List Format',
      description: 'Emoji-header + bullet point structure typical of AI threads',
      weight: 25,
      severity: 'high',
    });
  }

  // Numbered thread: "1/ ... 2/ ... 3/ ..." or "1. ... 2. ... 3. ..."
  const numberedItems = text.match(/(?:^|\n)\s*\d+[./)\-]\s+/g);
  if (numberedItems && numberedItems.length >= 3) {
    signals.push({
      name: 'numbered_list',
      label: 'Numbered List Thread',
      description: `${numberedItems.length}-item numbered list — common AI format`,
      weight: 20,
      severity: 'high',
    });
  }

  // "Here are/is X things/ways/tips/lessons" thread starter
  if (/(?:here(?:'s|\s+(?:are|is)))\s+\d+\s+(?:things?|ways?|tips?|lessons?|secrets?|tools?|hacks?|mistakes?|reasons?|steps?|rules?|principles?|truths?|strategies?)\s/i.test(text)) {
    signals.push({
      name: 'listicle_opener',
      label: 'Listicle Opener',
      description: '"Here are X things..." — AI thread template',
      weight: 20,
      severity: 'high',
    });
  }

  // "I studied/analyzed/researched X for Y hours/days/months"
  if (/i\s+(?:studied|analyzed|researched|spent\s+\d+\s+(?:hours?|days?|months?|years?)\s+(?:studying|analyzing|researching|reading))\s/i.test(text)) {
    signals.push({
      name: 'study_claim',
      label: 'Formulaic Study Claim',
      description: '"I studied X for Y hours..." — AI authority template',
      weight: 15,
      severity: 'high',
    });
  }

  // Perfect parallel structure: "X isn't about Y. It's about Z."
  if (/(?:isn't|is not|aren't|are not)\s+about\s+.+\.\s*(?:it's|it is|they're|they are)\s+about\s+/i.test(text)) {
    signals.push({
      name: 'parallel_structure',
      label: 'Parallel Reframe',
      description: '"X isn\'t about Y. It\'s about Z." — AI rhetorical template',
      weight: 15,
      severity: 'high',
    });
  }

  // ── MEDIUM confidence: Patterns (5-12 pts) ──────────────────

  // Bullet points with emoji prefixes (3+)
  const emojiBullets = text.match(/(?:^|\n)\s*[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u2705\u274C]\s*[A-Z]/gu);
  if (emojiBullets && emojiBullets.length >= 3 && !signals.some(s => s.name === 'emoji_header_format')) {
    signals.push({
      name: 'emoji_bullets',
      label: 'Emoji Bullet List',
      description: `${emojiBullets.length} emoji-prefixed points`,
      weight: 12,
      severity: 'medium',
    });
  }

  // Thread indicator + formulaic opening: "🧵 Thread:" or "A thread on..."
  if (/^(?:🧵\s*|thread\s*[:\-]|a\s+thread\s+(?:on|about)\s)/i.test(text)) {
    signals.push({
      name: 'thread_format',
      label: 'Thread Format',
      description: 'Formulaic thread opening',
      weight: 8,
      severity: 'medium',
    });
  }

  // "The truth is" / "Here's what nobody tells you" / "What they don't tell you"
  if (/(?:the\s+(?:truth|reality)\s+(?:is|about)|(?:what\s+)?(?:they|nobody)\s+(?:don't|won't|never)\s+tell\s+you|here's\s+what\s+(?:nobody|no\s+one)\s+(?:talks?|mentions?)\s+about)/i.test(text)) {
    signals.push({
      name: 'revelation_hook',
      label: 'Revelation Hook',
      description: 'Formulaic "truth" claim pattern',
      weight: 8,
      severity: 'medium',
    });
  }

  // No contractions in 20+ word tweets (formal tone unusual for Twitter)
  if (tweet.wordCount >= 20) {
    const formalPhrases = (text.match(/\b(?:it is|do not|does not|did not|will not|can not|cannot|should not|would not|could not|is not|are not|was not|were not|has not|have not|had not)\b/gi) || []).length;
    if (formalPhrases >= 2) {
      signals.push({
        name: 'no_contractions',
        label: 'Formal Tone',
        description: `${formalPhrases} uncontracted phrases — unusual formality for tweets`,
        weight: 8,
        severity: 'medium',
      });
    }
  }

  // "Most people" / "99% of people" generalizations
  if (/(?:most\s+people|99%\s+of\s+people|\d+%\s+of\s+(?:people|entrepreneurs|founders|developers))\s+(?:don't|do not|won't|will not|fail\s+to|miss|overlook|underestimate|overestimate)/i.test(text)) {
    signals.push({
      name: 'mass_generalization',
      label: 'Mass Generalization',
      description: '"Most people don\'t..." — AI engagement template',
      weight: 10,
      severity: 'medium',
    });
  }

  // Excessive em-dashes or semicolons in a tweet
  const emDashes = (text.match(/[—–]/g) || []).length;
  const semicolons = (text.match(/;/g) || []).length;
  if (emDashes >= 3 || semicolons >= 3) {
    signals.push({
      name: 'formal_punctuation',
      label: 'Formal Punctuation',
      description: `${emDashes} em-dashes, ${semicolons} semicolons — AI writing style`,
      weight: 6,
      severity: 'medium',
    });
  }

  // ── LOW confidence: Vocabulary (3-8 pts) ────────────────────

  // AI vocabulary — only flag when 3+ words found (cluster)
  const words = text.toLowerCase().split(/\s+/);
  const foundAiWords: string[] = [];
  for (const word of words) {
    // Check single words
    if (AI_VOCAB.has(word.replace(/[.,!?;:'"]/g, ''))) {
      foundAiWords.push(word);
    }
  }
  // Also check multi-word phrases
  const lowerText = text.toLowerCase();
  for (const phrase of AI_VOCAB) {
    if (phrase.includes(' ') && lowerText.includes(phrase)) {
      foundAiWords.push(phrase);
    }
  }

  const uniqueAiWords = [...new Set(foundAiWords)];
  if (uniqueAiWords.length >= 3) {
    signals.push({
      name: 'ai_vocab_cluster',
      label: 'AI Vocabulary Cluster',
      description: `${uniqueAiWords.length} AI-typical words: ${uniqueAiWords.slice(0, 5).join(', ')}`,
      weight: Math.min(20, uniqueAiWords.length * 4),
      severity: uniqueAiWords.length >= 5 ? 'high' : 'medium',
    });
  } else if (uniqueAiWords.length >= 1 && tweet.wordCount <= 30) {
    // Single AI word in a short tweet — weak signal but worth noting
    signals.push({
      name: 'ai_vocab_single',
      label: 'AI Vocabulary',
      description: `AI-typical word: ${uniqueAiWords[0]}`,
      weight: 3,
      severity: 'low',
    });
  }

  // ── Calculate total ─────────────────────────────────────────

  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight < 15) return null; // need at least one strong signal or multiple weak ones

  return {
    category: 'ai',
    confidence: Math.min(100, totalWeight),
    signals,
  };
}
