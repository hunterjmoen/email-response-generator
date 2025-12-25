// Chrome Extension Storage Utilities

import { STORAGE_KEYS, API_BASE_URL } from './constants';
import type { User } from './types';

// Refresh token 5 minutes before expiry
const REFRESH_BUFFER_SECONDS = 300;

/**
 * Get a value from chrome.storage.local
 */
export async function getStorageItem<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] ?? null);
    });
  });
}

/**
 * Set a value in chrome.storage.local
 */
export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

/**
 * Remove a value from chrome.storage.local
 */
export async function removeStorageItem(key: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, resolve);
  });
}

/**
 * Clear all extension storage
 */
export async function clearStorage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.clear(resolve);
  });
}

// Auth-specific storage helpers

export async function getAccessToken(): Promise<string | null> {
  return getStorageItem<string>(STORAGE_KEYS.ACCESS_TOKEN);
}

export async function setAccessToken(token: string): Promise<void> {
  return setStorageItem(STORAGE_KEYS.ACCESS_TOKEN, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return getStorageItem<string>(STORAGE_KEYS.REFRESH_TOKEN);
}

export async function setRefreshToken(token: string): Promise<void> {
  return setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, token);
}

export async function getUser(): Promise<User | null> {
  return getStorageItem<User>(STORAGE_KEYS.USER);
}

export async function setUser(user: User): Promise<void> {
  return setStorageItem(STORAGE_KEYS.USER, user);
}

export async function clearAuthData(): Promise<void> {
  await Promise.all([
    removeStorageItem(STORAGE_KEYS.ACCESS_TOKEN),
    removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN),
    removeStorageItem(STORAGE_KEYS.USER),
    removeStorageItem(STORAGE_KEYS.SESSION_EXPIRY),
  ]);
}

export async function getSessionExpiry(): Promise<number | null> {
  return getStorageItem<number>(STORAGE_KEYS.SESSION_EXPIRY);
}

export async function setSessionExpiry(expiresAt: number): Promise<void> {
  return setStorageItem(STORAGE_KEYS.SESSION_EXPIRY, expiresAt);
}

/**
 * Check if the access token is expired or expiring soon
 */
async function isTokenExpired(): Promise<boolean> {
  const expiresAt = await getSessionExpiry();
  if (!expiresAt) return true;

  const now = Math.floor(Date.now() / 1000);
  return now >= expiresAt - REFRESH_BUFFER_SECONDS;
}

/**
 * Refresh the access token using the refresh token
 * Returns true if refresh was successful
 */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/extension/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    await Promise.all([
      setAccessToken(data.access_token),
      setRefreshToken(data.refresh_token),
      setSessionExpiry(data.expires_at),
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string | null> {
  const token = await getStorageItem<string>(STORAGE_KEYS.ACCESS_TOKEN);
  if (!token) return null;

  // Check if token needs refresh
  if (await isTokenExpired()) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      await clearAuthData();
      return null;
    }
    return getStorageItem<string>(STORAGE_KEYS.ACCESS_TOKEN);
  }

  return token;
}

/**
 * Check if user is authenticated (has valid tokens)
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getValidAccessToken();
  const user = await getUser();
  return !!(token && user);
}
