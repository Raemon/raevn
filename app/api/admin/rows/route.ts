import { NextResponse } from 'next/server';
import { loadAdminRows } from '@/app/admin/loadAdminRows';
import { withAdmin } from '@/lib/auth';

// The admin page polls this every few seconds so both of us editing the ledger
// at the same time see each other's rows.

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async () => {
  return NextResponse.json(await loadAdminRows(), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
});
