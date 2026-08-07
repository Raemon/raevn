'use client';

import { Tooltip } from '../handfasting/Tooltip';
import { cormorant } from './save-the-date/handfastingInvitationTypography';

// The dashed phrase in the hero subtitle. Hovering (or tabbing to it) reveals
// the note the hosts wrote for it on /admin — see lib/taglineHovertext.ts.
const TaglineHovertext = ({ children, hovertext }: { children: string; hovertext: string }) => (
  <Tooltip
    placement="top"
    maxWidth={340}
    styleManually
    background="rgba(0, 0, 0, 0.9)"
    surfaceClassName={`${cormorant.className} rv-tooltip-reveal whitespace-pre-wrap rounded-md border border-white/25 px-3 py-2 text-center text-[0.95rem] font-light italic leading-[1.45] tracking-[0.03em] text-[#e3e6eb]`}
    content={<span className="rv-tooltip-reveal-inner">{hovertext}</span>}
  >
    {/* underline-offset keeps the dashes clear of the italic descenders. */}
    <span
      tabIndex={0}
      className="cursor-help underline decoration-dashed decoration-[#878b92] decoration-from-font underline-offset-[0.28em] outline-none transition-[color,text-decoration-color] duration-150 hover:text-[#ecedf1] hover:decoration-[#c2c6cd] focus-visible:text-[#ecedf1] focus-visible:decoration-[#c2c6cd]"
    >
      {children}
    </span>
  </Tooltip>
);

export default TaglineHovertext;
