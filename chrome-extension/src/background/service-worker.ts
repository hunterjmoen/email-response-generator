// FreelanceFlow Extension Background Service Worker
// Handles auth, token refresh, and message passing

import { MESSAGE_TYPES } from '../shared/constants';
import {
  getValidAccessToken,
  setAccessToken,
  setRefreshToken,
  setSessionExpiry,
  setUser,
  getUser,
  clearAuthData,
  isAuthenticated,
} from '../shared/storage';
import { login as apiLogin, logout as apiLogout } from '../shared/api-client';
import type { ExtensionMessage, LoginPayload, AuthState, User } from '../shared/types';

// ============ Message Handlers ============

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));

  // Return true to indicate async response
  return true;
});

async function handleMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (message.type) {
    case MESSAGE_TYPES.LOGIN:
      return handleLogin(message.payload as LoginPayload);

    case MESSAGE_TYPES.LOGOUT:
      return handleLogout();

    case MESSAGE_TYPES.GET_AUTH_STATE:
      return getAuthState();

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

// ============ Auth Handlers ============

async function handleLogin(payload: LoginPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await apiLogin({
      email: payload.email,
      password: payload.password,
    });

    // Store tokens, expiry, and user data
    await setAccessToken(response.session.access_token);
    await setRefreshToken(response.session.refresh_token);
    await setSessionExpiry(response.session.expires_at);
    await setUser({
      id: response.user.id,
      email: response.user.email,
      first_name: response.user.first_name,
      last_name: response.user.last_name,
    });

    // Notify all tabs of auth state change
    broadcastAuthStateChange();

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    return { success: false, error: errorMessage };
  }
}

async function handleLogout(): Promise<{ success: boolean }> {
  try {
    await apiLogout();
  } catch {
    // Ignore logout API errors, clear local data anyway
  }

  await clearAuthData();
  broadcastAuthStateChange();

  return { success: true };
}

async function getAuthState(): Promise<AuthState> {
  const authenticated = await isAuthenticated();
  const user = await getUser();
  const accessToken = await getValidAccessToken();

  return {
    isAuthenticated: authenticated,
    user,
    accessToken,
    loading: false,
  };
}

// ============ Broadcast Helpers ============

async function broadcastAuthStateChange(): Promise<void> {
  const authState = await getAuthState();

  // Broadcast to all extension contexts
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.AUTH_STATE_CHANGED,
    payload: authState,
  }).catch(() => {
    // Ignore errors if no listeners
  });

  // Broadcast to all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: MESSAGE_TYPES.AUTH_STATE_CHANGED,
          payload: authState,
        }).catch(() => {
          // Ignore errors if content script not loaded
        });
      }
    });
  });
}

// ============ Extension Install/Update ============

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('FreelanceFlow extension installed');
  } else if (details.reason === 'update') {
    console.log('FreelanceFlow extension updated');
  }
});

// ============ Extension Icon Click ============

// Badge updates based on auth state
async function updateBadge(): Promise<void> {
  const authenticated = await isAuthenticated();

  if (authenticated) {
    chrome.action.setBadgeText({ text: '' });
  } else {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
  }
}

// Update badge on startup
updateBadge();

console.log('FreelanceFlow service worker initialized');
