// Filter Engine — hides, dims, or highlights posts based on score
import type { FilterMode, UserSettings, PostScore } from '../shared/types';

/** Apply filtering to a tweet element based on its score and user settings */
export function applyFilter(
  element: HTMLElement,
  score: PostScore,
  settings: UserSettings,
): 'shown' | 'dimmed' | 'hidden' {
  // Check whitelist
  if (settings.whitelist.includes(score.authorHandle.toLowerCase())) {
    resetFilter(element);
    return 'shown';
  }

  // Check blacklist
  if (settings.blacklist.includes(score.authorHandle.toLowerCase())) {
    hideElement(element);
    return 'hidden';
  }

  // Check if post is below threshold
  const belowThreshold = score.overallScore < settings.threshold;

  // Check individual category overrides
  const failsCategory =
    (settings.enableAiDetection && score.breakdown.aiScore >= 70) ||
    (settings.enableBaitDetection && score.breakdown.baitScore >= 70) ||
    (settings.enableBotDetection && score.breakdown.botScore >= 70);

  if (!belowThreshold && !failsCategory) {
    resetFilter(element);
    return 'shown';
  }

  switch (settings.mode) {
    case 'highlight':
      // Don't hide anything, just show the colors (handled by overlay)
      resetFilter(element);
      return 'shown';

    case 'dim':
      dimElement(element, score.overallScore);
      return 'dimmed';

    case 'clean':
      hideElement(element);
      return 'hidden';

    default:
      return 'shown';
  }
}

/** Dim a post — lower opacity based on how bad the score is */
function dimElement(element: HTMLElement, score: number): void {
  // Score 0 → 0.15 opacity, Score 39 → 0.4 opacity
  const opacity = 0.15 + (score / 100) * 0.35;
  element.style.opacity = String(Math.max(0.1, Math.min(0.5, opacity)));
  element.style.transition = 'opacity 0.3s ease';

  // Add undim on hover
  if (!element.dataset.fcDimmed) {
    element.dataset.fcDimmed = 'true';
    element.addEventListener('mouseenter', () => {
      element.style.opacity = '1';
    });
    element.addEventListener('mouseleave', () => {
      if (element.dataset.fcDimmed === 'true') {
        element.style.opacity = String(Math.max(0.1, Math.min(0.5, opacity)));
      }
    });
  }
}

/** Hide a post entirely with a smooth collapse */
function hideElement(element: HTMLElement): void {
  element.style.transition = 'max-height 0.3s ease, opacity 0.2s ease, margin 0.3s ease, padding 0.3s ease';
  element.style.overflow = 'hidden';
  element.style.opacity = '0';

  // Use requestAnimationFrame for smooth animation
  requestAnimationFrame(() => {
    element.style.maxHeight = '0px';
    element.style.margin = '0';
    element.style.padding = '0';
    element.style.borderWidth = '0';
  });
}

/** Reset any applied filters */
function resetFilter(element: HTMLElement): void {
  element.style.removeProperty('opacity');
  element.style.removeProperty('max-height');
  element.style.removeProperty('overflow');
  element.style.removeProperty('margin');
  element.style.removeProperty('padding');
  element.style.removeProperty('border-width');
  delete element.dataset.fcDimmed;
}

/** Show a "filtered" summary bar instead of hiding completely */
export function showFilteredSummary(
  element: HTMLElement,
  score: PostScore,
  onReveal: () => void,
): void {
  const summary = document.createElement('div');
  summary.className = 'fc-filtered-summary';
  summary.innerHTML = `
    <div style="
      padding: 8px 16px;
      background: #1a1a2e;
      border-left: 3px solid #ef4444;
      margin: 4px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      color: #6b7280;
      border-radius: 4px;
      cursor: pointer;
    ">
      <span>
        🛡️ Filtered: ${score.flags[0]?.label || 'Low quality'} 
        <span style="opacity: 0.5">(${score.grade} · ${score.overallScore}/100)</span>
      </span>
      <span style="color: #3b82f6; font-size: 11px;">Show anyway →</span>
    </div>
  `;

  summary.addEventListener('click', () => {
    summary.remove();
    resetFilter(element);
    element.style.display = '';
    onReveal();
  });

  element.style.display = 'none';
  element.parentNode?.insertBefore(summary, element);
}
