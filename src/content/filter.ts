// Filter Engine v2 — category-based actions
import type { DetectionResult, UserSettings, FilterAction, Category, CategoryFlag } from '../shared/types';
import { CATEGORY_META } from '../shared/types';

/**
 * Apply filtering based on detection result and user settings.
 * Returns the most aggressive action taken.
 */
export function applyFilter(
  element: HTMLElement,
  result: DetectionResult,
  settings: UserSettings,
): { action: 'none' | 'dim' | 'hide'; categories: Category[] } {
  // Check whitelist
  const authorHandle = element.dataset.fcAuthor?.toLowerCase();
  if (authorHandle && settings.whitelist.includes(authorHandle)) {
    resetFilter(element);
    return { action: 'none', categories: [] };
  }

  if (result.flags.length === 0) {
    resetFilter(element);
    return { action: 'none', categories: [] };
  }

  // Find the most aggressive action across all flagged categories
  let worstAction: FilterAction = 'show';
  const activeCategories: Category[] = [];

  for (const flag of result.flags) {
    const action = settings.filters[flag.category];
    if (action === 'hide') {
      worstAction = 'hide';
      activeCategories.push(flag.category);
    } else if (action === 'dim' && worstAction !== 'hide') {
      worstAction = 'dim';
      activeCategories.push(flag.category);
    } else if (action !== 'show') {
      activeCategories.push(flag.category);
    }
  }

  switch (worstAction) {
    case 'hide':
      hideElement(element, result.flags.filter(f => settings.filters[f.category] === 'hide'));
      return { action: 'hide', categories: activeCategories };

    case 'dim':
      dimElement(element);
      return { action: 'dim', categories: activeCategories };

    default:
      resetFilter(element);
      return { action: 'none', categories: activeCategories };
  }
}

function dimElement(element: HTMLElement): void {
  element.style.opacity = '0.3';
  element.style.transition = 'opacity 0.3s ease';

  if (!element.dataset.fcDimmed) {
    element.dataset.fcDimmed = 'true';
    element.addEventListener('mouseenter', () => {
      element.style.opacity = '1';
    });
    element.addEventListener('mouseleave', () => {
      if (element.dataset.fcDimmed === 'true') {
        element.style.opacity = '0.3';
      }
    });
  }
}

function hideElement(element: HTMLElement, flags: CategoryFlag[]): void {
  // Create a summary bar
  const summary = document.createElement('div');
  summary.className = 'fc-hidden-summary';

  const labels = flags.map(f => {
    const meta = CATEGORY_META[f.category];
    return `${meta.emoji} ${meta.label}`;
  }).join(' · ');

  summary.innerHTML = `
    <div style="
      padding: 6px 16px;
      background: #0d1117;
      border-left: 3px solid #374151;
      margin: 2px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      color: #4b5563;
      border-radius: 4px;
      cursor: pointer;
    ">
      <span>🛡️ Hidden: ${labels}</span>
      <span style="color: #3b82f6; font-size: 11px;">Show →</span>
    </div>
  `;

  summary.addEventListener('click', () => {
    summary.remove();
    resetFilter(element);
    element.style.display = '';
  });

  // Collapse the tweet
  element.style.transition = 'max-height 0.3s ease, opacity 0.2s ease';
  element.style.overflow = 'hidden';
  element.style.maxHeight = '0px';
  element.style.opacity = '0';
  element.style.margin = '0';
  element.style.padding = '0';

  element.parentNode?.insertBefore(summary, element);
}

function resetFilter(element: HTMLElement): void {
  element.style.removeProperty('opacity');
  element.style.removeProperty('max-height');
  element.style.removeProperty('overflow');
  element.style.removeProperty('margin');
  element.style.removeProperty('padding');
  delete element.dataset.fcDimmed;

  // Remove hidden summary bars
  const prev = element.previousElementSibling;
  if (prev?.classList.contains('fc-hidden-summary')) {
    prev.remove();
  }
}
