// FreelanceFlow Extension Constants

// API Configuration
// In production, this should point to your deployed FreelanceFlow instance
export const API_BASE_URL = 'http://localhost:3000';

// Supabase Configuration
// TODO: Update these with your actual Supabase credentials
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ff_access_token',
  REFRESH_TOKEN: 'ff_refresh_token',
  USER: 'ff_user',
  SESSION_EXPIRY: 'ff_session_expiry',
} as const;

// Message Types for extension communication
export const MESSAGE_TYPES = {
  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  GET_AUTH_STATE: 'GET_AUTH_STATE',
  AUTH_STATE_CHANGED: 'AUTH_STATE_CHANGED',

  // Gmail
  EMAIL_OPENED: 'EMAIL_OPENED',
  EMAIL_CLOSED: 'EMAIL_CLOSED',

  // Sidebar
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SIDEBAR_READY: 'SIDEBAR_READY',

  // API
  API_REQUEST: 'API_REQUEST',
  API_RESPONSE: 'API_RESPONSE',
} as const;

// Sidebar dimensions
export const SIDEBAR_WIDTH = 360;
