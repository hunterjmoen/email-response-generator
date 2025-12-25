import { createNextApiHandler } from '@trpc/server/adapters/next';
import type { NextApiRequest, NextApiResponse } from 'next';
import { appRouter } from '../../../server/routers/_app';
import { createContext } from '../../../server/trpc';

// Create the base tRPC handler
const trpcHandler = createNextApiHandler({
  router: appRouter,
  createContext,
  onError:
    process.env.NODE_ENV === 'development'
      ? ({ path, error }) => {
          console.error(
            `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
          );
        }
      : undefined,
});

// Wrapper to handle CORS for Chrome extensions
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin || '';

  console.log('[CORS Debug] Origin:', origin, 'Method:', req.method);
  console.log('[CORS Debug] Body:', JSON.stringify(req.body));

  // Allow Chrome extension origins (chrome-extension://<extension-id>)
  // and the main site origin
  const isExtensionOrigin = origin.startsWith('chrome-extension://');

  // Set CORS headers for extension origins
  if (isExtensionOrigin || origin === 'http://localhost:3000' || origin === (process.env.NEXT_PUBLIC_SITE_URL || '')) {
    console.log('[CORS Debug] Setting CORS headers for origin:', origin);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[CORS Debug] Handling OPTIONS preflight');
    res.status(200).end();
    return;
  }

  return trpcHandler(req, res);
}