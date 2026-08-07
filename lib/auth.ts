import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// The whole auth story lives in this file: two HMAC-signed stateless cookies,
// one for guests who arrived through an emailed invite link ("viewer") and one
// for the two of us ("admin"). No session table — a cookie is valid iff its
// signature checks out and it hasn't expired. Revoke a guest by deleting their
// Invitee row (the id lookup misses); revoke everyone by rotating AUTH_SECRET.
//
// Cookie value format: v1.<subject>.<expiresEpochSeconds>.<hmacSha256Hex>
// where subject is "invitee:<id>" or "admin". The value derives from the
// invitee *id*, never the emailed inviteToken, so a leaked cookie doesn't
// reveal the link and vice versa.

export const VIEWER_COOKIE = 'raevn_viewer';
export const ADMIN_COOKIE = 'raevn_admin';
export const VIEWER_TTL_DAYS = 180;
export const ADMIN_TTL_DAYS = 30;

export const getSecret = (): string => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set — generate 32 random bytes (hex) and set it in the environment.');
  return secret;
};

const sign = (payload: string): string =>
  createHmac('sha256', getSecret()).update(payload).digest('hex');

export const safeEqual = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
};

export const mintSession = (subject: string, ttlDays: number): string => {
  const expires = Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60;
  const payload = `v1.${subject}.${expires}`;
  return `${payload}.${sign(payload)}`;
};

// The expiry inside the signed payload is the one that counts; the cookie's
// Max-Age is client-enforced only.
export const verifySession = (raw: string | undefined): string | null => {
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  const [version, subject, expires, mac] = parts;
  if (!safeEqual(mac, sign(`${version}.${subject}.${expires}`))) return null;
  if (!/^\d+$/.test(expires) || Number(expires) * 1000 < Date.now()) return null;
  return subject;
};

const cookieFlags = (ttlDays: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // Lax, not Strict: guests arrive via cross-site clicks from email clients,
  // and Strict would drop the cookie on exactly that navigation. Lax still
  // blocks cross-site POSTs, which is all the CSRF protection we need.
  sameSite: 'lax' as const,
  path: '/',
  maxAge: ttlDays * 24 * 60 * 60,
});

export const setViewerCookie = (response: NextResponse, inviteeId: string): void => {
  response.cookies.set(VIEWER_COOKIE, mintSession(`invitee:${inviteeId}`, VIEWER_TTL_DAYS), cookieFlags(VIEWER_TTL_DAYS));
};

export const setAdminCookie = (response: NextResponse): void => {
  response.cookies.set(ADMIN_COOKIE, mintSession('admin', ADMIN_TTL_DAYS), cookieFlags(ADMIN_TTL_DAYS));
};

export const getViewerInviteeId = async (): Promise<string | null> => {
  const subject = verifySession((await cookies()).get(VIEWER_COOKIE)?.value);
  return subject?.startsWith('invitee:') ? subject.slice('invitee:'.length) : null;
};

export const isAdmin = async (): Promise<boolean> =>
  verifySession((await cookies()).get(ADMIN_COOKIE)?.value) === 'admin';

export const requireAdmin = async (): Promise<NextResponse | null> =>
  (await isAdmin()) ? null : NextResponse.json({ error: 'Not authorized' }, { status: 401 });

// Wrap every /api/admin/* handler in this so the check is impossible to
// forget on routes added later.
export const withAdmin =
  <Ctx,>(handler: (request: Request, context: Ctx) => Promise<Response>) =>
  async (request: Request, context: Ctx): Promise<Response> =>
    (await requireAdmin()) ?? handler(request, context);

// Login-time check only. Unlike the old isAdminAuthorized there is no
// NODE_ENV bypass: dev runs the same auth as prod, because dev has
// historically pointed at the production database.
export const isCorrectAdminKey = (candidate: string): boolean => {
  const adminKey = process.env.ADMIN_KEY;
  return !!adminKey && safeEqual(candidate, adminKey);
};
