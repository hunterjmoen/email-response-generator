import { updateSession } from './utils/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Add CORS headers for API routes with multiple origin support
 */
function addCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  // Get allowed origins from environment or default
  const allowedOriginsString = process.env.ALLOWED_ORIGINS;
  const defaultOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const allowedOrigins = allowedOriginsString
    ? allowedOriginsString.split(',').map(o => o.trim())
    : [defaultOrigin];

  // Check if origin is allowed (including Chrome extension origins)
  const isExtensionOrigin = origin?.startsWith('chrome-extension://') || false;
  const isAllowedOrigin = origin && (allowedOrigins.includes(origin) || isExtensionOrigin);

  // Add CORS headers if origin is allowed
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  return response;
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  // Handle preflight OPTIONS request for API routes
  if (request.method === 'OPTIONS' && isApiRoute) {
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    return addCorsHeaders(response, origin);
  }

  // Normal request handling with Supabase session update
  const response = await updateSession(request);

  // Add CORS headers for API routes
  if (isApiRoute) {
    return addCorsHeaders(response, origin);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
