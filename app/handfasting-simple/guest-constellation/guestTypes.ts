import type { Guest } from '@prisma/client';

type GuestJson = Omit<Guest, 'createdAt'> & { createdAt: string };

// The GET endpoint includes the linked invitee's side so the tapestry can
// place each guest on Elizabeth's or Ray's half; optimistic rows and legacy
// registrations simply lack it.
export type GuestWithOptimistic = GuestJson & {
  optimistic?: boolean;
  invitee?: { side: string; diagramHovertext?: string | null } | null;
};
