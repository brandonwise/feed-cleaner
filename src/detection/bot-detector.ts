// Bot/Farm Account Detection
import { BOT_INDICATORS } from './patterns';
import type { AnalysisContext, DetectionResult, DetectionFlag } from './types';

/**
 * Detect bot/farm account signals.
 * Returns score 0-100 where higher = more likely bot.
 */
export function detectBot(ctx: AnalysisContext): DetectionResult {
  const flags: DetectionFlag[] = [];
  let totalScore = 0;

  // ── Generic Reply Detection ─────────────────────────────────
  if (ctx.isReply) {
    for (const pattern of BOT_INDICATORS.genericReply.patterns) {
      if (pattern.test(ctx.text.trim())) {
        totalScore += BOT_INDICATORS.genericReply.weight;
        flags.push({
          name: 'generic_reply',
          label: 'Generic Reply',
          description: 'This reply could be pasted on any post — likely automated or low-effort',
          severity: 'high',
          score: BOT_INDICATORS.genericReply.weight,
        });
        break;
      }
    }
  }

  // ── Template Post Detection ─────────────────────────────────
  for (const pattern of BOT_INDICATORS.templatePost.patterns) {
    if (pattern.test(ctx.text)) {
      totalScore += BOT_INDICATORS.templatePost.weight;
      flags.push({
        name: 'template_post',
        label: 'Template Post',
        description: 'Follows a common automated post template',
        severity: 'low',
        score: BOT_INDICATORS.templatePost.weight,
      });
      break;
    }
  }

  // ── Account Metadata Analysis ───────────────────────────────
  if (ctx.authorMeta) {
    const meta = ctx.authorMeta;

    // Suspicious follower ratio
    if (meta.followersCount != null && meta.followingCount != null) {
      const ratio = meta.followingCount / Math.max(1, meta.followersCount);
      if (ratio > 10) {
        totalScore += BOT_INDICATORS.suspiciousFollowerRatio.weight;
        flags.push({
          name: 'suspicious_follower_ratio',
          label: 'Suspicious Follower Ratio',
          description: `Following ${meta.followingCount} but only ${meta.followersCount} followers (${ratio.toFixed(1)}:1 ratio)`,
          severity: 'medium',
          score: BOT_INDICATORS.suspiciousFollowerRatio.weight,
        });
      }
    }

    // New account with high activity
    if (meta.accountAge != null && meta.postCount != null) {
      const postsPerDay = meta.postCount / Math.max(1, meta.accountAge);
      if (meta.accountAge < 30 && postsPerDay > 10) {
        totalScore += BOT_INDICATORS.newAccountHighActivity.weight;
        flags.push({
          name: 'new_account_high_activity',
          label: 'New Account, High Activity',
          description: `Account is ${meta.accountAge} days old but posts ${postsPerDay.toFixed(1)}/day`,
          severity: 'high',
          score: BOT_INDICATORS.newAccountHighActivity.weight,
        });
      }
    }
  }

  // ── Repetitive Phrasing ─────────────────────────────────────
  // Check for repeated phrases (bot-like)
  const words = ctx.text.toLowerCase().split(/\s+/);
  if (words.length >= 6) {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }
    const maxRepeat = Math.max(...bigrams.values());
    if (maxRepeat >= 3 && words.length < 50) {
      totalScore += 5;
      flags.push({
        name: 'repetitive_phrasing',
        label: 'Repetitive Phrasing',
        description: `Same phrase repeated ${maxRepeat} times in a short post`,
        severity: 'medium',
        score: 5,
      });
    }
  }

  // ── Link-Only Content ───────────────────────────────────────
  if (ctx.hasLinks) {
    const nonLinkText = ctx.text.replace(/https?:\/\/\S+/g, '').trim();
    if (nonLinkText.length < 20 && ctx.stats.wordCount < 5) {
      totalScore += 4;
      flags.push({
        name: 'link_only',
        label: 'Link-Only Post',
        description: 'Almost no text content — just a link drop',
        severity: 'low',
        score: 4,
      });
    }
  }

  const confidence = ctx.authorMeta ? 0.8 : 0.4; // Much more confident with metadata
  const finalScore = Math.min(100, Math.round(totalScore));

  return { score: finalScore, flags, confidence };
}
