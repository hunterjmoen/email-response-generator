/**
 * Gmail Content Script
 * Injects "Generate Response" button into Gmail email view
 * and extracts email data for AI response generation.
 */

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__freelanceEmailAILoaded) return;
  window.__freelanceEmailAILoaded = true;

  const BUTTON_ID = 'freelance-ai-generate-btn';

  // Gmail DOM selectors (multiple fallbacks for robustness)
  const SELECTORS = {
    // Email action bar (where Reply/Forward buttons are)
    actionBar: [
      '[data-tooltip="Reply"]',
      '[aria-label="Reply"]',
      'div[role="button"][data-tooltip*="Reply"]'
    ].join(', '),
    // Email container
    emailContainer: '.h7, .a3s.aiL, .a3s.aXjCH',
    // Sender info
    sender: '.gD, [email], .go',
    // Subject line
    subject: 'h2.hP, .hP',
    // Email body
    body: '.a3s.aiL, .a3s.aXjCH, .ii.gt',
    // Thread messages (previous emails)
    threadMessages: '.h7',
    // Email date
    date: '.g3, .gH .g3'
  };

  /**
   * Create the "Generate Response" button
   */
  function createGenerateButton() {
    const button = document.createElement('div');
    button.id = BUTTON_ID;
    button.className = 'freelance-ai-btn';
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('data-tooltip', 'Generate AI Response');
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
      <span>Generate Response</span>
    `;

    button.addEventListener('click', handleGenerateClick);
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleGenerateClick();
      }
    });

    return button;
  }

  /**
   * Extract email data from the current view
   */
  function extractEmailData() {
    try {
      // Get sender
      const senderEl = document.querySelector(SELECTORS.sender);
      const senderEmail = senderEl?.getAttribute('email') || '';
      const senderName = senderEl?.getAttribute('name') || senderEl?.textContent?.trim() || '';

      // Get subject
      const subjectEl = document.querySelector(SELECTORS.subject);
      const subject = subjectEl?.textContent?.trim() || '';

      // Get email body (most recent message)
      const bodyEl = document.querySelector(SELECTORS.body);
      let body = '';
      if (bodyEl) {
        // Clone to avoid modifying the original
        const clone = bodyEl.cloneNode(true);
        // Remove quoted text (previous emails in thread)
        clone.querySelectorAll('.gmail_quote, .gmail_extra').forEach(el => el.remove());
        body = clone.textContent?.trim() || '';
      }

      // Get date
      const dateEl = document.querySelector(SELECTORS.date);
      const date = dateEl?.textContent?.trim() || '';

      // Get thread history (up to 3 previous messages)
      const threadMessages = [];
      const allMessages = document.querySelectorAll(SELECTORS.threadMessages);
      const messagesToCapture = Math.min(allMessages.length - 1, 3);
      for (let i = 0; i < messagesToCapture; i++) {
        const msg = allMessages[i];
        const msgBody = msg.querySelector(SELECTORS.body);
        if (msgBody) {
          threadMessages.push(msgBody.textContent?.trim()?.substring(0, 500) || '');
        }
      }

      // Truncate body if too long (max 2000 chars)
      if (body.length > 2000) {
        body = body.substring(0, 2000) + '...';
      }

      return {
        from: senderEmail || senderName,
        fromName: senderName,
        fromEmail: senderEmail,
        subject,
        body,
        date,
        thread: threadMessages,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Freelance AI] Error extracting email:', error);
      return null;
    }
  }

  /**
   * Handle click on Generate Response button
   */
  function handleGenerateClick() {
    const emailData = extractEmailData();

    if (!emailData || !emailData.body) {
      showNotification('Could not extract email content. Please try again.', 'error');
      return;
    }

    // Send email data to background script
    chrome.runtime.sendMessage({
      type: 'GENERATE_RESPONSE',
      emailData
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Freelance AI] Error:', chrome.runtime.lastError);
        showNotification('Extension error. Please try again.', 'error');
      }
    });
  }

  /**
   * Show a notification toast
   */
  function showNotification(message, type = 'info') {
    const existing = document.querySelector('.freelance-ai-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `freelance-ai-notification freelance-ai-notification--${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  }

  /**
   * Inject button into Gmail UI
   */
  function injectButton() {
    // Don't inject if already exists
    if (document.getElementById(BUTTON_ID)) return;

    // Find the action bar (Reply/Forward buttons area)
    const actionButtons = document.querySelectorAll(SELECTORS.actionBar);
    if (actionButtons.length === 0) return;

    // Find the last Reply button's parent container
    const lastReplyBtn = actionButtons[actionButtons.length - 1];
    const actionBar = lastReplyBtn?.closest('td, div[class*="amn"]');

    if (actionBar) {
      const button = createGenerateButton();
      // Insert after the action buttons
      if (actionBar.parentNode) {
        const wrapper = document.createElement('td');
        wrapper.appendChild(button);
        actionBar.parentNode.insertBefore(wrapper, actionBar.nextSibling);
      }
    }
  }

  /**
   * Remove injected button
   */
  function removeButton() {
    const btn = document.getElementById(BUTTON_ID);
    if (btn) {
      btn.closest('td')?.remove() || btn.remove();
    }
  }

  /**
   * Check if we're viewing an email
   */
  function isEmailView() {
    return !!document.querySelector(SELECTORS.body);
  }

  /**
   * Set up MutationObserver to watch for Gmail DOM changes
   */
  function setupObserver() {
    let debounceTimer = null;

    const observer = new MutationObserver(() => {
      // Debounce to avoid excessive processing
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isEmailView()) {
          injectButton();
        } else {
          removeButton();
        }
      }, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Listen for messages from popup/background
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_EMAIL_DATA') {
      const emailData = extractEmailData();
      sendResponse({ emailData });
    }
    return true;
  });

  /**
   * Initialize
   */
  function init() {
    // Initial check
    if (isEmailView()) {
      injectButton();
    }

    // Watch for changes
    setupObserver();

    console.log('[Freelance AI] Content script loaded');
  }

  // Wait for Gmail to fully load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to ensure Gmail's JS has initialized
    setTimeout(init, 500);
  }
})();
