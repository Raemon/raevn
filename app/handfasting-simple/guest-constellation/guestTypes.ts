import type { Guest } from '@prisma/client';

type GuestJson = Omit<Guest, 'createdAt'> & { createdAt: string };

export type GuestWithOptimistic = GuestJson & { optimistic?: boolean };
