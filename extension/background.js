/**
 * Background Service Worker
 * Handles API communication and message passing
 */

const DEFAULT_API_URL = 'https://api.freelance-flow.com';

/**
 * Get stored settings
 */
async function getSettings() {
  const result = await chrome.storage.sync.get({
    apiUrl: DEFAULT_API_URL,
    authToken: null,
    tonePreference: 'professional',
    responseCount: 3
  });
  return result;
}

/**
 * Get auth token from storage
 */
async function getAuthToken() {
  const settings = await getSettings();
  return settings.authToken;
}

/**
 * Save auth token
 */
async function saveAuthToken(token) {
  await chrome.storage.sync.set({ authToken: token });
}

/**
 * Clear auth data
 */
async function clearAuth() {
  await chrome.storage.sync.remove(['authToken', 'userEmail']);
}

/**
 * Login with email and password
 */
async function login(email, password) {
  const settings = await getSettings();
  const apiUrl = settings.apiUrl || DEFAULT_API_URL;

  try {
    // Use Supabase auth endpoint
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();

    if (data.accessToken) {
      await saveAuthToken(data.accessToken);
      await chrome.storage.sync.set({ userEmail: email });
      return { success: true, email };
    } else {
      throw new Error('No access token received');
    }
  } catch (error) {
    console.error('[Background] Login error:', error);
    throw error;
  }
}

/**
 * Generate response using the streaming API
 */
async function generateResponse(emailData, onChunk) {
  const settings = await getSettings();
  const token = settings.authToken;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const apiUrl = settings.apiUrl || DEFAULT_API_URL;

  // Prepare request body matching the existing API format
  const requestBody = {
    originalMessage: formatEmailForAPI(emailData),
    context: {
      relationshipStage: 'ongoing',
      projectPhase: 'active',
      urgency: 'medium',
      messageType: 'request'
    }
  };

  const response = await fetch(`${apiUrl}/api/responses/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    if (response.status === 401) {
      await clearAuth();
      throw new Error('Session expired. Please log in again.');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  // Handle SSE streaming response
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const responses = [{}, {}, {}];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'content') {
            const idx = data.responseIndex;
            if (idx >= 0 && idx < 3) {
              responses[idx].content = (responses[idx].content || '') + data.content;
              if (onChunk) {
                onChunk({ type: 'content', responseIndex: idx, responses: [...responses] });
              }
            }
          } else if (data.type === 'complete') {
            const idx = data.responseIndex;
            if (idx >= 0 && idx < 3 && data.metadata) {
              responses[idx].tone = data.metadata.tone;
              responses[idx].confidence = data.metadata.confidence;
            }
          } else if (data.type === 'done') {
            if (onChunk) {
              onChunk({ type: 'done', responses, historyId: data.historyId });
            }
          } else if (data.type === 'error') {
            throw new Error(data.message || 'Stream error');
          }
        } catch (e) {
          // Ignore parse errors for incomplete data
          if (e.message !== 'Stream error') {
            console.warn('[Background] Parse warning:', e);
          } else {
            throw e;
          }
        }
      }
    }
  }

  return responses;
}

/**
 * Format email data for the API
 */
function formatEmailForAPI(emailData) {
  const parts = [];

  if (emailData.fromName || emailData.from) {
    parts.push(`From: ${emailData.fromName || emailData.from}`);
  }
  if (emailData.subject) {
    parts.push(`Subject: ${emailData.subject}`);
  }
  if (emailData.date) {
    parts.push(`Date: ${emailData.date}`);
  }

  parts.push('');
  parts.push(emailData.body);

  // Include thread context if available
  if (emailData.thread && emailData.thread.length > 0) {
    parts.push('');
    parts.push('--- Previous messages ---');
    emailData.thread.forEach((msg, i) => {
      parts.push(`[${i + 1}] ${msg}`);
    });
  }

  return parts.join('\n');
}

/**
 * Store current email data for popup access
 */
let currentEmailData = null;

/**
 * Message handler
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GENERATE_RESPONSE':
      // Store email data and open popup
      currentEmailData = message.emailData;
      chrome.action.openPopup();
      sendResponse({ success: true });
      break;

    case 'GET_CURRENT_EMAIL':
      sendResponse({ emailData: currentEmailData });
      break;

    case 'CLEAR_CURRENT_EMAIL':
      currentEmailData = null;
      sendResponse({ success: true });
      break;

    case 'LOGIN':
      login(message.email, message.password)
        .then(result => sendResponse({ success: true, ...result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response

    case 'LOGOUT':
      clearAuth()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'CHECK_AUTH':
      getAuthToken()
        .then(async token => {
          if (token) {
            const settings = await chrome.storage.sync.get(['userEmail']);
            sendResponse({ authenticated: true, email: settings.userEmail });
          } else {
            sendResponse({ authenticated: false });
          }
        })
        .catch(() => sendResponse({ authenticated: false }));
      return true;

    case 'GET_SETTINGS':
      getSettings()
        .then(settings => sendResponse(settings))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'STREAM_RESPONSE':
      // Handle streaming in a special way for the popup
      const port = chrome.runtime.connect({ name: 'stream' });
      generateResponse(message.emailData, (chunk) => {
        port.postMessage(chunk);
      })
        .then(responses => {
          sendResponse({ success: true, responses });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

/**
 * Handle long-lived connections for streaming
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'stream') {
    port.onMessage.addListener(async (message) => {
      if (message.type === 'START_STREAM') {
        try {
          await generateResponse(message.emailData, (chunk) => {
            port.postMessage(chunk);
          });
        } catch (error) {
          port.postMessage({ type: 'error', message: error.message });
        }
      }
    });
  }
});

console.log('[Freelance AI] Background service worker loaded');
