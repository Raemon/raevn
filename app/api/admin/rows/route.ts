import { NextResponse } from 'next/server';
import { loadAdminRows } from '@/app/admin/loadAdminRows';
import { isAdminAuthorized } from '@/lib/isAdminAuthorized';

// The admin page polls this every few seconds so both of us editing the ledger
// at the same time see each other's rows. The key rides in a header rather than
// the query string so it stays out of logs and browser history.

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminAuthorized(request.headers.get('x-admin-key') ?? undefined)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  return NextResponse.json(await loadAdminRows(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
