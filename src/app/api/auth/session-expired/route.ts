import { NextResponse } from 'next/server';

const ADMIN_SESSION_COOKIE_NAME = 'votesync_admin_session';

export async function GET() {
  const response = new NextResponse(null, {
    status: 303,
    headers: {
      Location: '/admin-login',
    },
  });

  response.cookies.delete(ADMIN_SESSION_COOKIE_NAME);

  return response;
}
