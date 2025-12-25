// Sidebar Injector
// Injects the FreelanceFlow sidebar into Gmail

import { SIDEBAR_WIDTH } from '../shared/constants';
import type { ExtensionMessage } from '../shared/types';
import { GmailLayoutAdjuster } from './gmail-layout-adjuster';

export class SidebarInjector {
  private container: HTMLDivElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private isVisible = false;
  private toggleButton: HTMLButtonElement | null = null;
  private layoutAdjuster: GmailLayoutAdjuster;

  constructor() {
    this.layoutAdjuster = new GmailLayoutAdjuster();
  }

  inject() {
    if (this.container) return;

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'freelanceflow-sidebar-container';
    this.container.style.cssText = `
      position: fixed;
      right: 0;
      top: 0;
      width: ${SIDEBAR_WIDTH}px;
      height: 100vh;
      z-index: 9999;
      background: #ffffff;
      border-left: 1px solid #e5e7eb;
      box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      display: flex;
      flex-direction: column;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f9fafb;
    `;
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 24px; height: 24px; background: #059669; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-weight: bold; font-size: 12px;">F</span>
        </div>
        <span style="font-weight: 600; color: #111827; font-size: 14px;">FreelanceFlow</span>
      </div>
    `;

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: #6b7280;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    `;
    closeButton.addEventListener('click', () => this.hide());
    header.appendChild(closeButton);

    // Create iframe for sidebar content
    this.iframe = document.createElement('iframe');
    this.iframe.src = chrome.runtime.getURL('sidebar/sidebar.html');
    this.iframe.style.cssText = `
      width: 100%;
      flex: 1;
      border: none;
      background: white;
    `;

    this.container.appendChild(header);
    this.container.appendChild(this.iframe);
    document.body.appendChild(this.container);

    // Create toggle button
    this.createToggleButton();

    // Show sidebar by default
    setTimeout(() => this.show(), 500);
  }

  private createToggleButton() {
    this.toggleButton = document.createElement('button');
    this.toggleButton.id = 'freelanceflow-toggle';
    this.toggleButton.style.cssText = `
      position: fixed;
      right: 16px;
      bottom: 16px;
      width: 48px;
      height: 48px;
      background: #059669;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 9998;
      transition: transform 0.2s ease, background 0.2s ease;
    `;
    this.toggleButton.innerHTML = `
      <span style="color: white; font-weight: bold; font-size: 18px;">F</span>
    `;
    this.toggleButton.title = 'Toggle FreelanceFlow sidebar';
    this.toggleButton.addEventListener('click', () => this.toggle());
    this.toggleButton.addEventListener('mouseenter', () => {
      if (this.toggleButton) {
        this.toggleButton.style.transform = 'scale(1.1)';
      }
    });
    this.toggleButton.addEventListener('mouseleave', () => {
      if (this.toggleButton) {
        this.toggleButton.style.transform = 'scale(1)';
      }
    });

    document.body.appendChild(this.toggleButton);
  }

  show() {
    if (this.container) {
      this.container.style.transform = 'translateX(0)';
      this.isVisible = true;
    }
    if (this.toggleButton) {
      this.toggleButton.style.right = `${SIDEBAR_WIDTH + 16}px`;
    }
    // Push Gmail content left
    this.layoutAdjuster.adjustLayout();
  }

  hide() {
    if (this.container) {
      this.container.style.transform = 'translateX(100%)';
      this.isVisible = false;
    }
    if (this.toggleButton) {
      this.toggleButton.style.right = '16px';
    }
    // Restore Gmail content
    this.layoutAdjuster.resetLayout();
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  sendMessage(message: ExtensionMessage) {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(message, '*');
    }
  }

  remove() {
    this.layoutAdjuster.destroy();
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    if (this.toggleButton) {
      this.toggleButton.remove();
      this.toggleButton = null;
    }
    this.iframe = null;
  }
}
