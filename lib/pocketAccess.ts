import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSecret, isAdmin, safeEqual } from './auth';
import { POCKET_KEY_HEADER } from './pocketKeyHeader';

// The phone editor at /lantern/<key> has no login form: the URL *is* the
// password. That's a deliberate trade — typing a 40-character admin key into a
// phone keyboard is the reason the ledger never got edited from a couch — and
// it buys back safety two ways. The key is not the admin key, so a URL that
// leaks (a screenshot, a browser history, a shared tab) costs us the hovertext
// editor and nothing else; and the editor's API can only write
// diagramHovertext, so that cost is bounded no matter who finds the link.

export { POCKET_KEY_HEADER };

// Set POCKET_KEY to choose the slug by hand. Left unset it derives from
// AUTH_SECRET, so a deploy has a working secret URL without a second env var to
// remember — and rotating AUTH_SECRET rotates this link too. Either way the key
// never appears anywhere but the URL bar and /admin's footer.
export const pocketKey = (): string => {
  const configured = process.env.POCKET_KEY?.trim();
  if (configured) return configured;
  return createHmac('sha256', getSecret()).update('pocket-hovertext-v1').digest('hex').slice(0, 32);
};

export const isCorrectPocketKey = (candidate: string | undefined): boolean =>
  typeof candidate === 'string' && safeEqual(candidate, pocketKey());

// Wraps /api/pocket/* the way withAdmin wraps /api/admin/*. A signed-in admin
// passes too, so the same endpoints work from a desktop session without the key.
export const withPocketKey =
  <Ctx,>(handler: (request: Request, context: Ctx) => Promise<Response>) =>
  async (request: Request, context: Ctx): Promise<Response> => {
    if (isCorrectPocketKey(request.headers.get(POCKET_KEY_HEADER) ?? undefined)) {
      return handler(request, context);
    }
    if (await isAdmin()) return handler(request, context);
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  };
