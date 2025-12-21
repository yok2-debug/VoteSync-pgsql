import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_SESSION_COOKIE_NAME = 'votesync_admin_session';

/**
 * Proxy function (previously middleware) - Next.js 16 best practice
 * 
 * This should only handle lightweight redirects based on cookie presence.
 * Heavy authentication/authorization logic should be in:
 * - layout.tsx for page-level validation
 * - Server Actions for data access validation
 */
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const hasSessionCookie = request.cookies.has(ADMIN_SESSION_COOKIE_NAME);

    // Skip API routes - they handle their own auth
    if (pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    const isPublicAdminPage = pathname.startsWith('/admin-login');
    const isAdminRoute = pathname.startsWith('/admin');

    // Redirect logged-in users away from login page
    if (hasSessionCookie && isPublicAdminPage) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    // Redirect unauthenticated users to login
    if (!hasSessionCookie && isAdminRoute && !isPublicAdminPage) {
        return NextResponse.redirect(new URL('/admin-login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/admin-login'],
};
