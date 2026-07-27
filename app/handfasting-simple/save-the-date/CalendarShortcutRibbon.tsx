import { Tooltip } from '../../handfasting/Tooltip';
import { HANDFASTING_CALENDAR_SHORTCUT_BLUEPRINT_MATRIX } from './handfastingCalendarShortcutBlueprints';
import { glowAccentPaletteTokenForRibbonSlot } from './handfastingCalendarRibbonAccent';
import { cinzel } from './handfastingInvitationTypography';

const CalendarOutboundShortcutCue = ({
  outboundShortcutBlueprintBrief,
  ribbonSlotIndex,
}: {
  outboundShortcutBlueprintBrief: (typeof HANDFASTING_CALENDAR_SHORTCUT_BLUEPRINT_MATRIX)[number];
  ribbonSlotIndex: number;
}) => {
  const CalendarGlyph = outboundShortcutBlueprintBrief.iconGlyphSlot;
  const vendorHoverAccentTint = glowAccentPaletteTokenForRibbonSlot(ribbonSlotIndex);
  return (
    <Tooltip
      content={outboundShortcutBlueprintBrief.tooltipStoryFragment}
      accentColor={vendorHoverAccentTint}
      interactive
      placement="bottom"
    >
      <a
        href={outboundShortcutBlueprintBrief.outboundHref}
        {...(outboundShortcutBlueprintBrief.downloadFilename
          ? { download: outboundShortcutBlueprintBrief.downloadFilename }
          : { target: '_blank', rel: 'noopener noreferrer' })}
        aria-label={`Add to ${outboundShortcutBlueprintBrief.vendorLabelToken} Calendar`}
        className={`${cinzel.className} inline-flex items-center justify-center gap-[0.4rem] px-2 py-[0.35rem] text-[0.7rem] font-normal uppercase tracking-[0.18em] text-[#f1ece0] no-underline`}
      >
        <CalendarGlyph />
      </a>
    </Tooltip>
  );
};

// Mirrors the tactile row guests scan while pinning October into living memory.

const CalendarShortcutRibbon = () => (
  <div className="mt-[0.9rem] flex flex-wrap justify-center gap-[0.55rem]">
    {HANDFASTING_CALENDAR_SHORTCUT_BLUEPRINT_MATRIX.map((outboundShortcutBlueprintBrief, ribbonSlotIndex) => (
      <CalendarOutboundShortcutCue
        key={outboundShortcutBlueprintBrief.vendorLabelToken}
        outboundShortcutBlueprintBrief={outboundShortcutBlueprintBrief}
        ribbonSlotIndex={ribbonSlotIndex}
      />
    ))}
  </div>
);

export default CalendarShortcutRibbon;
