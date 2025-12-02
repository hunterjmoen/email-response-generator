/**
 * Options Page Script
 * Handles settings management
 */

(function() {
  'use strict';

  const DEFAULT_API_URL = 'https://api.freelance-flow.com';

  // DOM Elements
  const apiUrlInput = document.getElementById('api-url');
  const testConnectionBtn = document.getElementById('test-connection');
  const connectionStatus = document.getElementById('connection-status');
  const loggedInInfo = document.getElementById('logged-in-info');
  const loggedOutInfo = document.getElementById('logged-out-info');
  const accountEmail = document.getElementById('account-email');
  const logoutBtn = document.getElementById('logout-btn');
  const defaultToneSelect = document.getElementById('default-tone');
  const responseCountSelect = document.getElementById('response-count');
  const defaultUrgencySelect = document.getElementById('default-urgency');
  const defaultRelationshipSelect = document.getElementById('default-relationship');
  const defaultProjectPhaseSelect = document.getElementById('default-project-phase');
  const defaultMessageTypeSelect = document.getElementById('default-message-type');
  const saveBtn = document.getElementById('save-btn');
  const saveStatus = document.getElementById('save-status');

  /**
   * Initialize options page
   */
  async function init() {
    await loadSettings();
    await checkAuthStatus();
    setupEventListeners();
  }

  /**
   * Load settings from storage
   */
  async function loadSettings() {
    const settings = await chrome.storage.sync.get({
      apiUrl: '',
      tonePreference: 'professional',
      responseCount: '3',
      defaultUrgency: 'medium',
      defaultRelationship: 'ongoing',
      defaultProjectPhase: 'active',
      defaultMessageType: 'request'
    });

    apiUrlInput.value = settings.apiUrl || '';
    apiUrlInput.placeholder = DEFAULT_API_URL;
    defaultToneSelect.value = settings.tonePreference;
    responseCountSelect.value = settings.responseCount.toString();
    defaultUrgencySelect.value = settings.defaultUrgency;
    defaultRelationshipSelect.value = settings.defaultRelationship;
    defaultProjectPhaseSelect.value = settings.defaultProjectPhase;
    defaultMessageTypeSelect.value = settings.defaultMessageType;
  }

  /**
   * Check authentication status
   */
  async function checkAuthStatus() {
    try {
      const result = await chrome.storage.sync.get(['authToken', 'userEmail']);

      if (result.authToken) {
        loggedInInfo.classList.remove('hidden');
        loggedOutInfo.classList.add('hidden');
        accountEmail.textContent = result.userEmail || 'Authenticated';
      } else {
        loggedInInfo.classList.add('hidden');
        loggedOutInfo.classList.remove('hidden');
      }
    } catch (error) {
      loggedInInfo.classList.add('hidden');
      loggedOutInfo.classList.remove('hidden');
    }
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    testConnectionBtn.addEventListener('click', testConnection);
    logoutBtn.addEventListener('click', handleLogout);
    saveBtn.addEventListener('click', saveSettings);
  }

  /**
   * Test API connection
   */
  async function testConnection() {
    const apiUrl = apiUrlInput.value || DEFAULT_API_URL;

    showConnectionStatus('loading', 'Testing...');
    testConnectionBtn.disabled = true;

    try {
      const response = await fetch(`${apiUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        showConnectionStatus('success', 'Connected');
      } else {
        showConnectionStatus('error', `Error: ${response.status}`);
      }
    } catch (error) {
      showConnectionStatus('error', 'Connection failed');
    } finally {
      testConnectionBtn.disabled = false;
    }
  }

  /**
   * Show connection status
   */
  function showConnectionStatus(type, message) {
    connectionStatus.textContent = message;
    connectionStatus.className = `status-badge ${type}`;
    connectionStatus.classList.remove('hidden');

    if (type !== 'loading') {
      setTimeout(() => {
        connectionStatus.classList.add('hidden');
      }, 3000);
    }
  }

  /**
   * Handle logout
   */
  async function handleLogout() {
    await chrome.storage.sync.remove(['authToken', 'userEmail']);
    await checkAuthStatus();
  }

  /**
   * Save settings
   */
  async function saveSettings() {
    saveBtn.disabled = true;

    try {
      await chrome.storage.sync.set({
        apiUrl: apiUrlInput.value || '',
        tonePreference: defaultToneSelect.value,
        responseCount: responseCountSelect.value,
        defaultUrgency: defaultUrgencySelect.value,
        defaultRelationship: defaultRelationshipSelect.value,
        defaultProjectPhase: defaultProjectPhaseSelect.value,
        defaultMessageType: defaultMessageTypeSelect.value
      });

      showSaveStatus('success', 'Settings saved!');
    } catch (error) {
      showSaveStatus('error', 'Failed to save');
    } finally {
      saveBtn.disabled = false;
    }
  }

  /**
   * Show save status
   */
  function showSaveStatus(type, message) {
    saveStatus.textContent = message;
    saveStatus.className = `status-message ${type}`;
    saveStatus.classList.remove('hidden');

    setTimeout(() => {
      saveStatus.classList.add('hidden');
    }, 3000);
  }

  // Initialize
  init();
})();
