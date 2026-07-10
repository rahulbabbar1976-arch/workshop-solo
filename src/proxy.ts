import { NextRequest, NextResponse } from 'next/server';

// Routes that never require authentication
const PUBLIC_ROUTES = new Set(['/', '/solo/login', '/solo/register']);

// Prefix that bypasses auth entirely
const AUTH_API_PREFIX = '/api/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Always allow static assets & public routes ──────────────────────────
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // ── 2. /api/auth/* – always public ─────────────────────────────────────────
  if (pathname.startsWith(AUTH_API_PREFIX)) {
    return NextResponse.next();
  }

  const userId   = request.cookies.get('workshop_user_id')?.value;
  const userRole = request.cookies.get('workshop_user_role')?.value;

  // ── 3. /api/* – require session cookie, return 401 JSON if missing ──────────
  if (pathname.startsWith('/api/')) {
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required.' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // ── 4. /autobot-admin/* – require admin or super_admin role ────────────────
  if (pathname.startsWith('/autobot-admin')) {
    if (!userId || !['super_admin', 'admin'].includes(userRole ?? '')) {
      const loginUrl = new URL('/solo/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── 5. /solo/* – require session cookie (except login/register) ─────────────
  if (pathname.startsWith('/solo/')) {
    // Allow login and register pages without auth
    if (pathname === '/solo/login' || pathname === '/solo/register') {
      return NextResponse.next();
    }
    if (!userId) {
      const loginUrl = new URL('/solo/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── 6. Everything else – allow ─────────────────────────────────────────────
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
};
