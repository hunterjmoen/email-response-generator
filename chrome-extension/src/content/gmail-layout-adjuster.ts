// Gmail Layout Adjuster
// Directly manipulates Gmail's DOM to push content left when sidebar opens

import { SIDEBAR_WIDTH } from '../shared/constants';

export class GmailLayoutAdjuster {
  private adjustedElement: HTMLElement | null = null;
  private originalWidth: string = '';
  private isAdjusted = false;

  adjustLayout() {
    if (this.isAdjusted) return;

    // Find Gmail's main view container - the one that holds everything except the left nav
    // This is typically the second child div.nH inside body > div.nH
    const outerContainer = document.querySelector<HTMLElement>('body > div.nH');
    if (!outerContainer) return;

    // Find the main content area (not the left navigation)
    // Gmail structure: body > div.nH > div.nH (left nav) + div.nH (main content)
    const mainContent = outerContainer.querySelector<HTMLElement>(':scope > div.nH:last-of-type');

    if (mainContent) {
      this.adjustedElement = mainContent;
      this.originalWidth = mainContent.style.width || '';

      // Use width adjustment instead of right, as Gmail uses flex/absolute positioning
      const computedStyle = window.getComputedStyle(mainContent);
      const currentWidth = mainContent.offsetWidth;

      mainContent.style.transition = 'width 0.3s ease';
      mainContent.style.width = `calc(100% - ${SIDEBAR_WIDTH}px)`;

      this.isAdjusted = true;
    }
  }

  resetLayout() {
    if (!this.isAdjusted || !this.adjustedElement) return;

    this.adjustedElement.style.width = this.originalWidth;

    // Clean up transition after animation
    setTimeout(() => {
      if (this.adjustedElement) {
        this.adjustedElement.style.transition = '';
      }
    }, 300);

    this.adjustedElement = null;
    this.isAdjusted = false;
  }

  destroy() {
    this.resetLayout();
  }
}
