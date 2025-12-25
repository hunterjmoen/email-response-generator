// FreelanceFlow Gmail Content Script
// Entry point that initializes Gmail detection and sidebar injection

import { GmailDetector } from './gmail-detector';
import { SidebarInjector } from './sidebar-injector';
import { MESSAGE_TYPES } from '../shared/constants';
import type { ExtensionMessage, AuthState } from '../shared/types';

class FreelanceFlowGmail {
  private gmailDetector: GmailDetector;
  private sidebarInjector: SidebarInjector;
  private isAuthenticated = false;

  constructor() {
    this.gmailDetector = new GmailDetector();
    this.sidebarInjector = new SidebarInjector();
  }

  async init() {
    // Check auth state first
    const authState = await this.getAuthState();
    this.isAuthenticated = authState.isAuthenticated;

    if (!this.isAuthenticated) {
      console.log('[FreelanceFlow] Not authenticated. Sidebar disabled.');
      return;
    }

    // Start Gmail detection
    this.gmailDetector.start((emailData) => {
      // Notify sidebar of email change
      this.sidebarInjector.sendMessage({
        type: MESSAGE_TYPES.EMAIL_OPENED,
        payload: emailData,
      });
    });

    // Inject sidebar
    this.sidebarInjector.inject();

    // Listen for messages
    this.setupMessageListeners();

    console.log('[FreelanceFlow] Gmail integration initialized');
  }

  private async getAuthState(): Promise<AuthState> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: MESSAGE_TYPES.GET_AUTH_STATE } as ExtensionMessage,
        (response: AuthState) => {
          resolve(response || { isAuthenticated: false, user: null, accessToken: null, loading: false });
        }
      );
    });
  }

  private setupMessageListeners() {
    // Listen for auth state changes
    chrome.runtime.onMessage.addListener((message: ExtensionMessage<AuthState>) => {
      if (message.type === MESSAGE_TYPES.AUTH_STATE_CHANGED && message.payload) {
        this.isAuthenticated = message.payload.isAuthenticated;

        if (this.isAuthenticated) {
          this.sidebarInjector.show();
        } else {
          this.sidebarInjector.hide();
        }
      }
    });

    // Listen for toggle sidebar command
    chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
      if (message.type === MESSAGE_TYPES.TOGGLE_SIDEBAR) {
        this.sidebarInjector.toggle();
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new FreelanceFlowGmail().init();
  });
} else {
  new FreelanceFlowGmail().init();
}
