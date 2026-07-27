import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setViewerCookie } from '@/lib/auth';

// The emailed invite link. It never renders anything: it trades the URL token
// for the long-lived viewer cookie and bounces to /, so the secret leaves the
// address bar immediately and the personalized page lives at a shareable-safe
// URL. Bad or stale tokens land on the locked shell, whose copy already says
// "check your email".

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitee = await prisma.invitee.findUnique({ where: { inviteToken: token } });
  const response = NextResponse.redirect(new URL('/', request.url), 303);
  if (invitee) setViewerCookie(response, invitee.id);
  return response;
}
