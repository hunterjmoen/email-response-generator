// Re-export the browser client for backwards compatibility
// This uses cookie-based sessions via @supabase/ssr
export { createClient } from './supabase/client'

// Singleton instance for convenience
import { createClient as createBrowserClient } from './supabase/client'
export const supabase = createBrowserClient()