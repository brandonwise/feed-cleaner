// Visual Overlay v2 — category tags instead of score badges
import type { DetectionResult, CategoryFlag, Category, CATEGORY_META as MetaType } from '../shared/types';
import { CATEGORY_META } from '../shared/types';

const TAG_CLASS = 'fc-tag';
const DETAIL_CLASS = 'fc-detail-panel';

/** Apply category tags to a flagged tweet */
export function applyTags(element: HTMLElement, result: DetectionResult): void {
  if (element.dataset.fcProcessed === result.tweetId) return;
  element.dataset.fcProcessed = result.tweetId;

  if (result.flags.length === 0) return;

  // Find the action bar to append tags
  const actionBar = element.querySelector('[role="group"]');
  if (!actionBar) return;

  const container = document.createElement('div');
  container.className = TAG_CLASS;
  container.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
    vertical-align: middle;
  `;

  for (const flag of result.flags) {
    const meta = CATEGORY_META[flag.category];
    const tag = createTag(meta, flag);

    tag.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleDetail(element, flag);
    });

    container.appendChild(tag);
  }

  actionBar.appendChild(container);
}

/** Remove tags from a tweet */
export function removeTags(element: HTMLElement): void {
  delete element.dataset.fcProcessed;
  element.querySelectorAll(`.${TAG_CLASS}, .${DETAIL_CLASS}`).forEach(el => el.remove());
}

function createTag(meta: typeof CATEGORY_META[Category], flag: CategoryFlag): HTMLElement {
  const tag = document.createElement('span');
  tag.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: ${meta.bgColor};
    color: ${meta.color};
    border: 1px solid ${meta.borderColor}60;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s ease;
    line-height: 1.3;
  `;

  tag.textContent = `${meta.emoji} ${meta.label}`;
  tag.title = `${flag.signals.length} signal${flag.signals.length === 1 ? '' : 's'} · ${flag.confidence}% confidence`;

  tag.addEventListener('mouseenter', () => {
    tag.style.transform = 'scale(1.05)';
    tag.style.boxShadow = `0 0 8px ${meta.borderColor}40`;
  });
  tag.addEventListener('mouseleave', () => {
    tag.style.transform = 'scale(1)';
    tag.style.boxShadow = 'none';
  });

  return tag;
}

function toggleDetail(element: HTMLElement, flag: CategoryFlag): void {
  const existing = element.querySelector(`.${DETAIL_CLASS}`);
  if (existing) {
    existing.remove();
    return;
  }

  const meta = CATEGORY_META[flag.category];
  const panel = document.createElement('div');
  panel.className = DETAIL_CLASS;

  panel.innerHTML = `
    <div style="
      margin: 8px 0;
      padding: 12px 16px;
      background: ${meta.bgColor}40;
      border: 1px solid ${meta.borderColor}60;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #e7e9ea;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-weight: 700; font-size: 14px;">
          ${meta.emoji} ${meta.label} Detected
        </span>
        <span style="
          padding: 2px 10px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 12px;
          background: ${meta.bgColor};
          color: ${meta.color};
          border: 1px solid ${meta.borderColor};
        ">${flag.confidence}% confidence</span>
      </div>

      <div style="border-top: 1px solid #333; padding-top: 8px;">
        ${flag.signals.map(s => `
          <div style="
            display: flex;
            align-items: flex-start;
            gap: 6px;
            padding: 4px 0;
            font-size: 12px;
          ">
            <span style="flex-shrink: 0;">${
              s.severity === 'high' ? '🔴' : s.severity === 'medium' ? '🟡' : '⚪'
            }</span>
            <div>
              <span style="font-weight: 600; color: ${meta.color};">${s.label}</span>
              <div style="color: #9ca3af; font-size: 11px; margin-top: 1px;">${s.description}</div>
            </div>
          </div>
        `).join('')}
      </div>

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

  panel.querySelector('.fc-close-detail')?.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.remove();
  });

  const tweetText = element.querySelector('[data-testid="tweetText"]');
  if (tweetText?.parentElement) {
    tweetText.parentElement.insertBefore(panel, tweetText.nextSibling);
  } else {
    element.appendChild(panel);
  }
}
