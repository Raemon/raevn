import {
  HANDFASTING_EVENT_DETAILS,
  HANDFASTING_EVENT_LOCATION,
  HANDFASTING_EVENT_TITLE,
} from './handfastingSaveTheDateBrief';

// Bridges Outlook patrons who insist on Microsoft's composer workflow.

export const weaveOutlookComposerHandoffHref = (): string =>
  [
    'https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent',
    `subject=${encodeURIComponent(HANDFASTING_EVENT_TITLE)}`,
    'startdt=2026-10-24T16:00:00-07:00',
    'enddt=2026-10-24T19:00:00-07:00',
    `body=${encodeURIComponent(HANDFASTING_EVENT_DETAILS)}`,
    `location=${encodeURIComponent(HANDFASTING_EVENT_LOCATION)}`,
  ].join('&');
