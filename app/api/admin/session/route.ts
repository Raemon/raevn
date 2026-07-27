import { NextResponse } from 'next/server';
import { isCorrectAdminKey, setAdminCookie } from '@/lib/auth';

// The one place the admin key ever transits: a POST body over TLS, traded for
// a 30-day cookie. It never rides in a URL, a JSON API body, or a header again.

export async function POST(request: Request) {
  const form = await request.formData();
  const key = form.get('key');
  if (typeof key !== 'string' || !isCorrectAdminKey(key)) {
    // Enough brute-force protection for a two-user site.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.redirect(new URL('/admin/login?error=1', request.url), 303);
  }
  const response = NextResponse.redirect(new URL('/admin', request.url), 303);
  setAdminCookie(response);
  return response;
}
