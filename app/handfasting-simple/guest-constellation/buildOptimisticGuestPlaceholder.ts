import type { GuestWithOptimistic } from './guestTypes';

// Fabricates believable placeholders so optimistic UI feels instant beneath the skyline.

export const buildOptimisticGuestPlaceholder = (
  enteredNameTrimmed: string,
  temporaryIdentifier: string,
): GuestWithOptimistic => ({
  id: temporaryIdentifier,
  name: enteredNameTrimmed,
  diet: 'omnivore',
  meaningful: false,
  plusOne: '',
  createdAt: new Date().toISOString(),
  optimistic: true,
});
