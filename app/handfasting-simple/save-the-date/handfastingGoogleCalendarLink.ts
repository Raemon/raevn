import {
  HANDFASTING_EVENT_DETAILS,
  HANDFASTING_EVENT_LOCATION,
  HANDFASTING_EVENT_TITLE,
} from './handfastingSaveTheDateBrief';

// Crafts Google deeplinks with ceremony copy prefilled for busy guests.

export const weaveGoogleCalendarHandoffHref = (): string =>
  [
    'https://calendar.google.com/calendar/render?action=TEMPLATE',
    `text=${encodeURIComponent(HANDFASTING_EVENT_TITLE)}`,
    'dates=20261024T230000Z/20261025T020000Z',
    'ctz=America/Los_Angeles',
    `details=${encodeURIComponent(HANDFASTING_EVENT_DETAILS)}`,
    `location=${encodeURIComponent(HANDFASTING_EVENT_LOCATION)}`,
  ].join('&');
