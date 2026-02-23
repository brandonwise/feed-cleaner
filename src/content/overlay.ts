// Visual Overlay — renders quality indicators on tweets
import { GRADE_COLORS, GEM_STYLE } from '../detection/scorer';
import type { PostScore, Grade, Flag } from '../shared/types';

const BADGE_CLASS = 'fc-score-badge';
const DETAIL_CLASS = 'fc-detail-panel';
const HALO_CLASS = 'fc-quality-halo';
const GEM_CLASS = 'fc-gem';

/** Apply visual overlay to a tweet element */
export function applyOverlay(element: HTMLElement, score: PostScore, showBadge: boolean, showGems: boolean): void {
  // Skip if already processed
  if (element.dataset.fcScored === score.tweetId) return;
  element.dataset.fcScored = score.tweetId;
  element.dataset.fcScore = String(score.overallScore);
  element.dataset.fcGrade = score.grade;

  // Apply quality halo (subtle border glow)
  applyHalo(element, score);

  // Add score badge
  if (showBadge) {
    addScoreBadge(element, score);
  }

  // Add gem indicator
  if (showGems && score.isGem) {
    addGemBadge(element);
  }
}

/** Remove overlay from a tweet element */
export function removeOverlay(element: HTMLElement): void {
  delete element.dataset.fcScored;
  delete element.dataset.fcScore;
  delete element.dataset.fcGrade;
  element.style.removeProperty('box-shadow');
  element.style.removeProperty('border-left');
  element.querySelectorAll(`.${BADGE_CLASS}, .${DETAIL_CLASS}, .${GEM_CLASS}`).forEach(el => el.remove());
}

// ── Halo ──────────────────────────────────────────────────────

function applyHalo(element: HTMLElement, score: PostScore): void {
  const colors = GRADE_COLORS[score.grade];
  // Subtle left border + very faint glow
  element.style.borderLeft = `3px solid ${colors.border}`;
  element.style.boxShadow = `inset 4px 0 8px -4px ${colors.glow}`;
  element.style.transition = 'border-left 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease';

  if (score.isGem) {
    element.style.boxShadow = `inset 4px 0 12px -4px ${GEM_STYLE.glow}, 0 0 20px -8px ${GEM_STYLE.glow}`;
    element.style.borderLeft = `3px solid ${GEM_STYLE.border}`;
  }
}

// ── Score Badge ───────────────────────────────────────────────

function addScoreBadge(element: HTMLElement, score: PostScore): void {
  // Find the action bar (like/retweet/reply buttons) to place badge nearby
  const actionBar = element.querySelector('[role="group"]');
  if (!actionBar) return;

  const colors = GRADE_COLORS[score.grade];

  const badge = document.createElement('div');
  badge.className = BADGE_CLASS;
  badge.innerHTML = `
    <span class="fc-grade" style="
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${colors.bg};
      color: ${colors.text};
      border: 1px solid ${colors.border}40;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
      line-height: 1;
    ">${score.grade}<span style="font-size: 10px; opacity: 0.7">${score.overallScore}</span></span>
  `;

  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    margin-left: 8px;
    vertical-align: middle;
  `;

  // Hover effect
  const gradeEl = badge.querySelector('.fc-grade') as HTMLElement;
  gradeEl.addEventListener('mouseenter', () => {
    gradeEl.style.transform = 'scale(1.1)';
    gradeEl.style.boxShadow = `0 0 8px ${colors.glow}`;
  });
  gradeEl.addEventListener('mouseleave', () => {
    gradeEl.style.transform = 'scale(1)';
    gradeEl.style.boxShadow = 'none';
  });

  // Click to toggle detail panel
  gradeEl.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleDetailPanel(element, score);
  });

  actionBar.appendChild(badge);
}

// ── Gem Badge ─────────────────────────────────────────────────

function addGemBadge(element: HTMLElement): void {
  const nameEl = element.querySelector('[data-testid="User-Name"]');
  if (!nameEl) return;

  const gem = document.createElement('span');
  gem.className = GEM_CLASS;
  gem.textContent = ' 💎';
  gem.title = 'Gem — high quality, genuine content';
  gem.style.cssText = `
    font-size: 14px;
    cursor: help;
    animation: fc-gem-pulse 2s ease-in-out infinite;
  `;
  nameEl.appendChild(gem);
}

// ── Detail Panel ──────────────────────────────────────────────

function toggleDetailPanel(element: HTMLElement, score: PostScore): void {
  const existing = element.querySelector(`.${DETAIL_CLASS}`);
  if (existing) {
    existing.remove();
    return;
  }

  const panel = document.createElement('div');
  panel.className = DETAIL_CLASS;

  const { breakdown, flags } = score;
  const colors = GRADE_COLORS[score.grade];

  panel.innerHTML = `
    <div style="
      margin: 8px 0;
      padding: 12px 16px;
      background: ${colors.bg}20;
      border: 1px solid ${colors.border}40;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #e7e9ea;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-weight: 700; font-size: 14px;">Feed Cleaner Analysis</span>
        <span style="
          padding: 2px 10px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 16px;
          background: ${colors.bg};
          color: ${colors.text};
          border: 1px solid ${colors.border};
        ">${score.grade} ${score.overallScore}</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;">
        ${renderBar('AI Generated', breakdown.aiScore, true)}
        ${renderBar('Engagement Bait', breakdown.baitScore, true)}
        ${renderBar('Bot Signals', breakdown.botScore, true)}
        ${renderBar('Originality', breakdown.originalityScore, false)}
      </div>

      ${flags.length > 0 ? `
        <div style="border-top: 1px solid #333; padding-top: 8px; margin-top: 4px;">
          <div style="font-weight: 600; margin-bottom: 6px; font-size: 12px; color: #9ca3af;">DETAILS</div>
          ${flags.slice(0, 5).map(f => renderFlag(f)).join('')}
          ${flags.length > 5 ? `<div style="color: #6b7280; font-size: 11px;">+${flags.length - 5} more signals</div>` : ''}
        </div>
      ` : ''}

      <div style="text-align: right; margin-top: 8px;">
        <button class="fc-close-detail" style="
          background: none;
          border: 1px solid #555;
          color: #9ca3af;
          padding: 3px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 11px;
        ">Close</button>
      </div>
    </div>
  `;

  // Close button
  panel.querySelector('.fc-close-detail')?.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.remove();
  });

  // Insert after the tweet text
  const tweetText = element.querySelector('[data-testid="tweetText"]');
  if (tweetText?.parentElement) {
    tweetText.parentElement.insertBefore(panel, tweetText.nextSibling);
  } else {
    element.appendChild(panel);
  }
}

function renderBar(label: string, value: number, inverted: boolean): string {
  // For inverted bars (AI, Bait, Bot), high = bad (red), low = good (green)
  // For non-inverted (Originality), high = good (green), low = bad (red)
  const isGood = inverted ? value < 30 : value >= 60;
  const isBad = inverted ? value >= 60 : value < 30;
  const color = isGood ? '#10b981' : isBad ? '#ef4444' : '#f59e0b';

  return `
    <div style="padding: 3px 0;">
      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
        <span style="color: #9ca3af;">${label}</span>
        <span style="color: ${color}; font-weight: 600;">${value}</span>
      </div>
      <div style="background: #1f2937; border-radius: 3px; height: 4px; overflow: hidden;">
        <div style="
          width: ${value}%;
          height: 100%;
          background: ${color};
          border-radius: 3px;
          transition: width 0.5s ease;
        "></div>
      </div>
    </div>
  `;
}

function renderFlag(flag: Flag): string {
  const severityColors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#6b7280',
  };
  const severityIcons = {
    high: '🔴',
    medium: '🟡',
    low: '⚪',
  };

  return `
    <div style="
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 3px 0;
      font-size: 12px;
    ">
      <span style="flex-shrink: 0;">${severityIcons[flag.severity]}</span>
      <div>
        <span style="font-weight: 600; color: ${severityColors[flag.severity]};">${flag.label}</span>
        <div style="color: #6b7280; font-size: 11px;">${flag.description}</div>
      </div>
    </div>
  `;
}
