// Issues React keys guaranteed not to collide with Prisma-backed cuids yet.

export const issueTemporaryGuestIdentity = (): string => `temp:${crypto.randomUUID()}`;
