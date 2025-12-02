/**
 * Popup Script
 * Handles UI logic and user interactions
 */

(function() {
  'use strict';

  // DOM Elements
  const loginView = document.getElementById('login-view');
  const mainView = document.getElementById('main-view');
  const noEmailView = document.getElementById('no-email-view');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userEmailEl = document.getElementById('user-email');
  const settingsBtn = document.getElementById('settings-btn');
  const generateBtn = document.getElementById('generate-btn');
  const previewFrom = document.getElementById('preview-from');
  const previewSubject = document.getElementById('preview-subject');
  const previewBody = document.getElementById('preview-body');
  const responsesContainer = document.getElementById('responses-container');
  const responsesList = document.getElementById('responses-list');

  // State
  let currentEmailData = null;
  let isGenerating = false;

  /**
   * Initialize popup
   */
  async function init() {
    // Check authentication
    const authResult = await sendMessage({ type: 'CHECK_AUTH' });

    if (authResult.authenticated) {
      userEmailEl.textContent = authResult.email || 'Authenticated';
      await checkForEmailData();
    } else {
      showView('login');
    }

    // Set up event listeners
    setupEventListeners();
  }

  /**
   * Check for email data from content script
   */
  async function checkForEmailData() {
    // First check if we have stored email data
    const result = await sendMessage({ type: 'GET_CURRENT_EMAIL' });

    if (result.emailData) {
      currentEmailData = result.emailData;
      displayEmailPreview(currentEmailData);
      showView('main');
      generateBtn.disabled = false;
    } else {
      // Try to get from active tab
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url && tab.url.includes('mail.google.com')) {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_EMAIL_DATA' });
          if (response && response.emailData && response.emailData.body) {
            currentEmailData = response.emailData;
            displayEmailPreview(currentEmailData);
            showView('main');
            generateBtn.disabled = false;
          } else {
            showView('no-email');
          }
        } else {
          showView('no-email');
        }
      } catch (e) {
        console.log('Could not get email data from tab:', e);
        showView('no-email');
      }
    }
  }

  /**
   * Display email preview
   */
  function displayEmailPreview(emailData) {
    previewFrom.textContent = emailData.fromName || emailData.from || '-';
    previewSubject.textContent = emailData.subject || '(No subject)';
    previewBody.textContent = truncate(emailData.body, 150);
  }

  /**
   * Truncate text
   */
  function truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Show a specific view
   */
  function showView(viewName) {
    loginView.classList.add('hidden');
    mainView.classList.add('hidden');
    noEmailView.classList.add('hidden');

    switch (viewName) {
      case 'login':
        loginView.classList.remove('hidden');
        break;
      case 'main':
        mainView.classList.remove('hidden');
        break;
      case 'no-email':
        noEmailView.classList.remove('hidden');
        break;
    }
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);

    // Logout button
    logoutBtn.addEventListener('click', handleLogout);

    // Settings button
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Generate button
    generateBtn.addEventListener('click', handleGenerate);
  }

  /**
   * Handle login
   */
  async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    setLoginLoading(true);
    hideError();

    try {
      const result = await sendMessage({
        type: 'LOGIN',
        email,
        password
      });

      if (result.success) {
        userEmailEl.textContent = email;
        await checkForEmailData();
      } else {
        showError(result.error || 'Login failed');
      }
    } catch (error) {
      showError(error.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  }

  /**
   * Handle logout
   */
  async function handleLogout() {
    await sendMessage({ type: 'LOGOUT' });
    showView('login');
    loginForm.reset();
  }

  /**
   * Handle generate response
   */
  async function handleGenerate() {
    if (!currentEmailData || isGenerating) return;

    isGenerating = true;
    setGenerateLoading(true);
    responsesContainer.classList.remove('hidden');
    responsesList.innerHTML = '';

    // Create placeholder cards for all 3 responses
    const tones = ['Professional', 'Casual', 'Formal'];
    tones.forEach((tone, idx) => {
      responsesList.appendChild(createResponseCard(idx, tone));
    });

    try {
      // Connect to background for streaming
      const port = chrome.runtime.connect({ name: 'stream' });

      port.onMessage.addListener((message) => {
        if (message.type === 'content') {
          updateResponseCard(message.responseIndex, message.responses[message.responseIndex]);
        } else if (message.type === 'done') {
          message.responses.forEach((resp, idx) => {
            finalizeResponseCard(idx, resp);
          });
          setGenerateLoading(false);
          isGenerating = false;
        } else if (message.type === 'error') {
          showGenerateError(message.message);
          setGenerateLoading(false);
          isGenerating = false;
        }
      });

      port.postMessage({
        type: 'START_STREAM',
        emailData: currentEmailData
      });

    } catch (error) {
      showGenerateError(error.message);
      setGenerateLoading(false);
      isGenerating = false;
    }
  }

  /**
   * Create response card
   */
  function createResponseCard(index, tone) {
    const card = document.createElement('div');
    card.className = 'response-card streaming';
    card.id = `response-${index}`;
    card.innerHTML = `
      <div class="response-header">
        <span class="response-tone ${tone.toLowerCase()}">${tone}</span>
        <span class="response-confidence"></span>
      </div>
      <div class="response-content streaming">Generating...</div>
      <div class="response-actions">
        <button class="btn btn-secondary copy-btn" data-index="${index}" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy
        </button>
        <button class="btn btn-secondary edit-btn" data-index="${index}" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Edit
        </button>
      </div>
    `;
    return card;
  }

  /**
   * Update response card with streaming content
   */
  function updateResponseCard(index, response) {
    const card = document.getElementById(`response-${index}`);
    if (!card) return;

    const contentEl = card.querySelector('.response-content');
    contentEl.textContent = response.content || '';
  }

  /**
   * Finalize response card
   */
  function finalizeResponseCard(index, response) {
    const card = document.getElementById(`response-${index}`);
    if (!card) return;

    card.classList.remove('streaming');

    const contentEl = card.querySelector('.response-content');
    contentEl.classList.remove('streaming');
    contentEl.textContent = response.content || 'No response generated';

    const confidenceEl = card.querySelector('.response-confidence');
    if (response.confidence) {
      confidenceEl.textContent = `${Math.round(response.confidence * 100)}% confidence`;
    }

    // Enable buttons
    const copyBtn = card.querySelector('.copy-btn');
    const editBtn = card.querySelector('.edit-btn');
    copyBtn.disabled = false;
    editBtn.disabled = false;

    // Set up copy handler
    copyBtn.addEventListener('click', () => {
      copyToClipboard(response.content, copyBtn);
    });

    // Set up edit handler (opens in a textarea)
    editBtn.addEventListener('click', () => {
      openEditor(index, response.content);
    });
  }

  /**
   * Copy to clipboard
   */
  async function copyToClipboard(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      const originalText = button.innerHTML;
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied!
      `;
      button.classList.add('copy-success');
      setTimeout(() => {
        button.innerHTML = originalText;
        button.classList.remove('copy-success');
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }

  /**
   * Open editor for response
   */
  function openEditor(index, content) {
    const card = document.getElementById(`response-${index}`);
    const contentEl = card.querySelector('.response-content');

    // Replace content with textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'response-content';
    textarea.style.cssText = 'width: 100%; min-height: 100px; padding: 12px; border: none; font-family: inherit; font-size: 13px; resize: vertical;';
    textarea.value = content;
    contentEl.replaceWith(textarea);

    // Change Edit button to Save
    const editBtn = card.querySelector('.edit-btn');
    editBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Save
    `;

    // Replace handler
    const newEditBtn = editBtn.cloneNode(true);
    editBtn.replaceWith(newEditBtn);
    newEditBtn.addEventListener('click', () => {
      const newContent = textarea.value;
      const newContentEl = document.createElement('div');
      newContentEl.className = 'response-content';
      newContentEl.textContent = newContent;
      textarea.replaceWith(newContentEl);

      // Update copy button handler
      const copyBtn = card.querySelector('.copy-btn');
      const newCopyBtn = copyBtn.cloneNode(true);
      copyBtn.replaceWith(newCopyBtn);
      newCopyBtn.addEventListener('click', () => copyToClipboard(newContent, newCopyBtn));

      // Reset edit button
      newEditBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Edit
      `;

      const resetEditBtn = newEditBtn.cloneNode(true);
      newEditBtn.replaceWith(resetEditBtn);
      resetEditBtn.addEventListener('click', () => openEditor(index, newContent));
    });

    textarea.focus();
  }

  /**
   * Show generate error
   */
  function showGenerateError(message) {
    responsesList.innerHTML = `
      <div class="error-message">
        ${escapeHtml(message)}
      </div>
    `;
  }

  /**
   * Escape HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Set login loading state
   */
  function setLoginLoading(loading) {
    loginBtn.disabled = loading;
    loginBtn.querySelector('span:first-child').style.display = loading ? 'none' : '';
    loginBtn.querySelector('.spinner').classList.toggle('hidden', !loading);
  }

  /**
   * Set generate loading state
   */
  function setGenerateLoading(loading) {
    generateBtn.disabled = loading;
    generateBtn.querySelector('span').style.display = loading ? 'none' : '';
    generateBtn.querySelector('.spinner').classList.toggle('hidden', !loading);
  }

  /**
   * Show error message
   */
  function showError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
  }

  /**
   * Hide error message
   */
  function hideError() {
    loginError.classList.add('hidden');
  }

  /**
   * Send message to background script
   */
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Initialize
  init();
})();
