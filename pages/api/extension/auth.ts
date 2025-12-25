import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS for Chrome extension
  const origin = req.headers.origin || '';
  const isExtensionOrigin = origin.startsWith('chrome-extension://');

  if (isExtensionOrigin || origin === 'http://localhost:3000') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    // Sign in with Supabase
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!data.user || !data.session) {
      res.status(401).json({ error: 'Login failed' });
      return;
    }

    // Fetch user profile
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', data.user.id)
      .single();

    res.status(200).json({
      user: {
        id: userData?.id || data.user.id,
        email: userData?.email || data.user.email,
        first_name: userData?.first_name,
        last_name: userData?.last_name,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (error) {
    console.error('Extension auth error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
}
