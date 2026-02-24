// Ad & Promoted Content Detector — DOM-based, near 100% accuracy
import type { TweetData, CategoryFlag, Signal } from '../shared/types';

/**
 * Detect ads and promoted content.
 * Uses DOM markers (100% accurate) + text patterns (high accuracy).
 */
export function detectAd(tweet: TweetData): CategoryFlag | null {
  const signals: Signal[] = [];

  // ── DOM-based detection (highest confidence) ────────────────

  if (tweet.isPromoted) {
    signals.push({
      name: 'dom_promoted',
      label: 'Promoted Tweet',
      description: 'X marked this as a promoted/sponsored post',
      weight: 100,
      severity: 'high',
    });
  }

  // ── Verified org + promotional pattern ──────────────────────

  if (tweet.isVerifiedOrg && hasPromotionalCTA(tweet.text)) {
    signals.push({
      name: 'org_promo',
      label: 'Brand Promotion',
      description: `Verified org @${tweet.authorHandle} with promotional content`,
      weight: 40,
      severity: 'medium',
    });
  }

  // ── Product/app promotion patterns ──────────────────────────

  const promoPatterns: Array<{ pattern: RegExp; label: string; desc: string }> = [
    {
      pattern: /(?:download|get|try|install|sign\s*up|subscribe|use\s+code|get\s+started|start\s+(?:your\s+)?free)\b/i,
      label: 'Call-to-Action',
      desc: 'Contains product/service CTA',
    },
    {
      pattern: /(?:available\s+(?:now|on|in)|launching\s+(?:today|now|soon)|now\s+(?:available|live|on)|coming\s+to)\s/i,
      label: 'Product Launch',
      desc: 'Product availability announcement',
    },
    {
      pattern: /(?:promo\s*code|discount|% off|\bsale\b|limited[- ]time\s+offer|exclusive\s+deal)/i,
      label: 'Promotional Offer',
      desc: 'Contains discount/promo language',
    },
    {
      pattern: /(?:link\s+in\s+bio|check\s+(?:out\s+)?(?:the\s+)?link|check\s+(?:it\s+)?out|👇\s*(?:https?:|link))/i,
      label: 'Link Push',
      desc: 'Directing to external link',
    },
  ];

  let promoScore = 0;
  for (const p of promoPatterns) {
    if (p.pattern.test(tweet.text)) {
      promoScore += 15;
      signals.push({
        name: p.label.toLowerCase().replace(/\s/g, '_'),
        label: p.label,
        description: p.desc,
        weight: 15,
        severity: 'medium',
      });
    }
  }

  // ── App store links ─────────────────────────────────────────

  const appDomains = ['apps.apple.com', 'play.google.com', 'microsoft.com/store'];
  for (const domain of tweet.linkDomains) {
    if (appDomains.some(d => domain.includes(d))) {
      signals.push({
        name: 'app_store_link',
        label: 'App Store Link',
        description: `Links to ${domain}`,
        weight: 25,
        severity: 'medium',
      });
    }
  }

  // ── Calculate total ─────────────────────────────────────────

  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight < 30) return null;

  return {
    category: 'ad',
    confidence: Math.min(100, totalWeight),
    signals,
  };
}

function hasPromotionalCTA(text: string): boolean {
  return /(?:try|download|get|sign\s*up|subscribe|check\s+out|learn\s+more|start\s+(?:your|a)\s)/i.test(text);
}
