import type { ComponentType, ReactNode } from 'react';
import CalendarVendorUncertaintyFootnote from './CalendarVendorUncertaintyFootnote';
import AppleCalendarGlyph from './AppleCalendarGlyph';
import GoogleCalendarGlyph from './GoogleCalendarGlyph';
import OutlookCalendarGlyph from './OutlookCalendarGlyph';
import { weaveGoogleCalendarHandoffHref } from './handfastingGoogleCalendarLink';
import { weaveOutlookComposerHandoffHref } from './handfastingOutlookCalendarLink';
import {
  HANDFASTING_ICS_DOWNLOAD_NAME,
  HANDFASTING_ICS_ROUTE,
} from './handfastingSaveTheDateBrief';

// Describes how each vendor hears about the ceremony outside our control.

export type CalendarOutboundShortcutBlueprint = {
  vendorLabelToken: string;
  outboundHref: string;
  iconGlyphSlot: ComponentType<object>;
  downloadFilename?: string;
  tooltipStoryFragment: ReactNode;
};

export const HANDFASTING_CALENDAR_SHORTCUT_BLUEPRINT_MATRIX: CalendarOutboundShortcutBlueprint[] = [
  {
    vendorLabelToken: 'Google',
    outboundHref: weaveGoogleCalendarHandoffHref(),
    iconGlyphSlot: GoogleCalendarGlyph,
    tooltipStoryFragment: 'Add to Google Calendar',
  },
  {
    vendorLabelToken: 'Apple',
    outboundHref: HANDFASTING_ICS_ROUTE,
    iconGlyphSlot: AppleCalendarGlyph,
    downloadFilename: HANDFASTING_ICS_DOWNLOAD_NAME,
    tooltipStoryFragment: (
      <>
        Add to Apple Calendar
        <CalendarVendorUncertaintyFootnote vendorLabel="Apple Calendar" />
      </>
    ),
  },
  {
    vendorLabelToken: 'Outlook',
    outboundHref: weaveOutlookComposerHandoffHref(),
    iconGlyphSlot: OutlookCalendarGlyph,
    tooltipStoryFragment: (
      <>
        Add to Outlook Calendar
        <CalendarVendorUncertaintyFootnote vendorLabel="Outlook" />
      </>
    ),
  },
];
