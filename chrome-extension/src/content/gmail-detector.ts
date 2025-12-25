// Gmail Email Detection
// Detects when emails are opened and extracts email data

import type { EmailData } from '../shared/types';

type EmailCallback = (email: EmailData) => void;

export class GmailDetector {
  private observer: MutationObserver | null = null;
  private currentEmailId: string | null = null;
  private callback: EmailCallback | null = null;

  start(callback: EmailCallback) {
    this.callback = callback;

    // Set up mutation observer to detect email view changes
    this.observer = new MutationObserver(this.handleMutations.bind(this));

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-message-id', 'aria-label', 'class'],
    });

    // Check for already open email
    this.checkForEmail();
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.callback = null;
  }

  private handleMutations(_mutations: MutationRecord[]) {
    // Debounce the check
    requestAnimationFrame(() => this.checkForEmail());
  }

  private checkForEmail() {
    // Gmail uses data-message-id or data-legacy-message-id for email containers
    const emailContainer =
      document.querySelector('[data-message-id]') ||
      document.querySelector('[data-legacy-message-id]');

    if (!emailContainer) {
      if (this.currentEmailId) {
        this.currentEmailId = null;
      }
      return;
    }

    const emailId =
      emailContainer.getAttribute('data-message-id') ||
      emailContainer.getAttribute('data-legacy-message-id');

    if (emailId && emailId !== this.currentEmailId) {
      this.currentEmailId = emailId;
      const emailData = this.extractEmailData(emailContainer);

      if (emailData.senderEmail && this.callback) {
        this.callback(emailData);
      }
    }
  }

  private extractEmailData(emailContainer: Element): EmailData {
    // Gmail DOM structure varies, so we try multiple selectors
    const emailData: EmailData = {
      senderEmail: '',
      senderName: '',
      subject: '',
      body: '',
      timestamp: new Date().toISOString(),
    };

    // Extract sender email - search within the email container
    // Gmail uses email attribute on span elements
    const senderElement = emailContainer.querySelector('[email]');
    if (senderElement) {
      emailData.senderEmail = senderElement.getAttribute('email') || '';
      emailData.senderName = senderElement.getAttribute('name') ||
                             senderElement.textContent?.trim() || '';
    }

    // Alternative: Look for "from" in aria labels within container
    if (!emailData.senderEmail) {
      const fromSpan = emailContainer.querySelector('[data-hovercard-id]');
      if (fromSpan) {
        const hoverCardId = fromSpan.getAttribute('data-hovercard-id');
        if (hoverCardId && hoverCardId.includes('@')) {
          emailData.senderEmail = hoverCardId;
        }
      }
    }

    // Extract subject
    // Subject is usually in an h2 inside the thread view
    const subjectElement = document.querySelector('h2[data-thread-perm-id]') ||
                          document.querySelector('[data-legacy-thread-id]')?.closest('div')?.querySelector('h2');
    if (subjectElement) {
      emailData.subject = subjectElement.textContent?.trim() || '';
    }

    // Alternative: Get from document title
    if (!emailData.subject) {
      const title = document.title;
      // Gmail titles are usually "Subject - email@example.com - Gmail"
      const subjectMatch = title.match(/^(.+?) - .+@.+ - Gmail$/);
      if (subjectMatch) {
        emailData.subject = subjectMatch[1];
      }
    }

    // Extract email body - search within the email container
    // Email body is in a div with class "a3s" (Gmail's obfuscated class)
    const bodyElement = emailContainer.querySelector('.a3s') ||
                       emailContainer.querySelector('.a3s.aiL') ||
                       emailContainer.querySelector('[dir="ltr"]');
    if (bodyElement) {
      emailData.body = bodyElement.textContent?.trim() || '';
    }

    // Get message/thread IDs from the container we already have
    emailData.messageId = emailContainer.getAttribute('data-message-id') ||
                          emailContainer.getAttribute('data-legacy-message-id') ||
                          undefined;

    const threadIdElement = document.querySelector('[data-legacy-thread-id]');
    if (threadIdElement) {
      emailData.threadId = threadIdElement.getAttribute('data-legacy-thread-id') || undefined;
    }

    return emailData;
  }
}
