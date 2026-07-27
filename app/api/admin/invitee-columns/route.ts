import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth';
import { isInviteeColumnId } from '@/app/admin/inviteeColumns';
import { writeInviteeColumnOrder } from '@/lib/inviteeColumnOrder';

// Persists the invitee table's column order to the checked-in JSON file, so a
// drag on the admin page survives a reload and can be committed.
export const POST = withAdmin(async (request: Request) => {
  const body = (await request.json()) as Record<string, unknown>;
  const columns = Array.isArray(body.columns) ? body.columns.filter(isInviteeColumnId) : [];
  if (columns.length === 0) {
    return NextResponse.json({ error: 'No known columns in request' }, { status: 400 });
  }
  const written = await writeInviteeColumnOrder(columns);
  if (!written) {
    // Read-only filesystem (a deployed build) — the drag stays local-only.
    return NextResponse.json({ error: 'Could not write column order file' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});
