// Text statistical analysis — ported from Humanizer
import type { TextStats } from './types';

/** Count syllables in a word (approximation) */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 2) return 1;

  // Remove silent e
  word = word.replace(/e$/, '');

  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g);
  const count = vowelGroups ? vowelGroups.length : 1;
  return Math.max(1, count);
}

/** Split text into sentences */
function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.split(/\s+/).length > 1);
}

/** Compute Flesch-Kincaid readability grade level */
function fleschKincaid(
  totalWords: number,
  totalSentences: number,
  totalSyllables: number,
): number {
  if (totalSentences === 0 || totalWords === 0) return 0;
  return (
    0.39 * (totalWords / totalSentences) +
    11.8 * (totalSyllables / totalWords) -
    15.59
  );
}

/** Compute burstiness — variance in sentence lengths.
 *  Higher burstiness = more human (humans vary sentence length naturally).
 *  AI tends to produce uniform sentence lengths.
 */
function computeBurstiness(sentenceLengths: number[]): number {
  if (sentenceLengths.length < 2) return 0;

  const mean = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  const variance =
    sentenceLengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) /
    (sentenceLengths.length - 1);
  const stddev = Math.sqrt(variance);

  // Coefficient of variation — normalized by mean
  return mean > 0 ? stddev / mean : 0;
}

/** Analyze text and return statistical features */
export function analyzeText(text: string): TextStats {
  const cleanText = text.replace(/https?:\/\/\S+/g, '').replace(/@\w+/g, '').trim();
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  const sentences = splitSentences(cleanText);

  const wordCount = words.length;
  const sentenceCount = sentences.length;

  // Unique word ratio (type-token ratio)
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z']/g, '')));
  const uniqueWordRatio = wordCount > 0 ? uniqueWords.size / wordCount : 0;

  // Average word length
  const totalWordLength = words.reduce((sum, w) => sum + w.replace(/[^a-z]/gi, '').length, 0);
  const avgWordLength = wordCount > 0 ? totalWordLength / wordCount : 0;

  // Syllables
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const syllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 0;

  // Sentence lengths
  const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
  const avgWordsPerSentence = sentenceCount > 0
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceCount
    : 0;

  // Variance in sentence length
  const sentenceLengthVariance = sentenceCount > 1
    ? sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgWordsPerSentence, 2), 0) / (sentenceCount - 1)
    : 0;

  return {
    wordCount,
    sentenceCount,
    avgWordsPerSentence,
    sentenceLengthVariance,
    uniqueWordRatio,
    avgWordLength,
    syllablesPerWord,
    fleschKincaid: fleschKincaid(wordCount, sentenceCount, totalSyllables),
    burstiness: computeBurstiness(sentenceLengths),
  };
}
