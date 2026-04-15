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

  const promoPatterns: Array<{
    name: string;
    pattern: RegExp;
    label: string;
    desc: string;
    weight: number;
    severity: Signal['severity'];
  }> = [
    {
      name: 'call_to_action',
      pattern: /(?:download|get|try|install|sign\s*up|subscribe|use\s+code|get\s+started|start\s+(?:your\s+)?free)\b/i,
      label: 'Call-to-Action',
      desc: 'Contains product/service CTA',
      weight: 15,
      severity: 'medium',
    },
    {
      name: 'product_launch',
      pattern: /(?:available\s+(?:now|on|in)|launching\s+(?:today|now|soon)|now\s+(?:available|live|on)|coming\s+to)\s/i,
      label: 'Product Launch',
      desc: 'Product availability announcement',
      weight: 15,
      severity: 'medium',
    },
    {
      name: 'promotional_offer',
      pattern: /(?:promo\s*code|discount|% off|\bsale\b|limited[- ]time\s+offer|exclusive\s+deal)/i,
      label: 'Promotional Offer',
      desc: 'Contains discount/promo language',
      weight: 15,
      severity: 'medium',
    },
    {
      name: 'link_push',
      pattern: /(?:link\s+in\s+bio|check\s+(?:out\s+)?(?:the\s+)?link|check\s+(?:it\s+)?out|👇\s*(?:https?:|link))/i,
      label: 'Link Push',
      desc: 'Directing to external link',
      weight: 15,
      severity: 'medium',
    },
    {
      name: 'affiliate_disclosure',
      pattern: /(?:\b#ad\b|sponsored|paid\s+partnership|affiliate\s+link|affiliate\b|commission)/i,
      label: 'Affiliate Disclosure',
      desc: 'Contains sponsorship or affiliate language',
      weight: 20,
      severity: 'high',
    },
    {
      name: 'monetization_claim',
      pattern: /(?:(?:earn|made|making)\s*\$?\d+(?:\.\d+)?[kKmM]?(?:,\d{3})*\s*(?:\/|\s+per\s+)?(?:day|week|month)|side\s*hustle|passive\s*income|make\s*money\s*(?:online|on\s+(?:x|twitter))|quit\s+your\s+job)/i,
      label: 'Monetization Claim',
      desc: 'Contains money-making or side-hustle claims',
      weight: 20,
      severity: 'high',
    },
    {
      name: 'funnel_language',
      pattern: /(?:dm\s+me\b|comment\s+["']?(?:guide|template|link|shop|course|ebook)["']?\b|drop\s+["']?(?:link|guide|template)["']?\b|reply\s+["']?link["']?)/i,
      label: 'Funnel Language',
      desc: 'Pushes users into DM/comment funnel for sales',
      weight: 15,
      severity: 'medium',
    },
    {
      name: 'keyword_comment_gate',
      pattern: /(?:comment\s+["']?(?:slides|guide|template|shop|link|course|ebook|dm)["']?\s+(?:for|to|get)|type\s+["']?(?:guide|link|shop)["']?\s+(?:below|in\s+comments))/i,
      label: 'Keyword Comment Funnel',
      desc: 'Uses keyword-comment funnel to route users into promo flow',
      weight: 18,
      severity: 'high',
    },
    {
      name: 'shop_growth_hack',
      pattern: /(?:tiktok\s+shop|dropshipping|affiliate\s+marketing|ugc\s+ads?|faceless\s+content)/i,
      label: 'Growth Hack Pitch',
      desc: 'Likely promotional growth-hack positioning',
      weight: 15,
      severity: 'medium',
    },
  ];

  for (const p of promoPatterns) {
    if (p.pattern.test(tweet.text)) {
      signals.push({
        name: p.name,
        label: p.label,
        description: p.desc,
        weight: p.weight,
        severity: p.severity,
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

  // ── Monetization / affiliate links ─────────────────────────

  const monetizationDomains = [
    'linktr.ee',
    'beacons.ai',
    'stan.store',
    'gumroad.com',
    'amzn.to',
    'ko-fi.com',
    'shopmy.us',
    'shopltk.com',
    'ltk.app',
    'bio.site',
    'msha.ke',
    'hoo.be',
    'snipfeed.co',
    'withkoji.com',
  ];
  const foundMonetizationDomain = tweet.linkDomains.find(domain =>
    monetizationDomains.some(d => domain.includes(d)),
  );

  if (foundMonetizationDomain) {
    signals.push({
      name: 'monetization_link',
      label: 'Monetization Link',
      description: `Links to creator monetization hub (${foundMonetizationDomain})`,
      weight: 20,
      severity: 'medium',
    });

    if (hasPromotionalCTA(tweet.text)) {
      signals.push({
        name: 'cta_plus_monetization_link',
        label: 'CTA + Monetization Link',
        description: 'Combines direct CTA with monetization landing link',
        weight: 15,
        severity: 'high',
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
