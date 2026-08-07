'use client';

import { useEffect, useState } from 'react';
import { Tooltip } from '../handfasting/Tooltip';
import { cormorant, playfair } from '../handfasting-simple/save-the-date/handfastingInvitationTypography';

const TapestryNameLabel = ({
  x,
  y,
  textAnchor,
  fontSize,
  fill,
  fadeDelay,
  name,
  hovertext,
  forceTooltipOpen = false,
}: {
  x: number;
  y: number;
  textAnchor: 'start' | 'end';
  fontSize: number;
  fill: string;
  fadeDelay: string;
  name: string;
  hovertext?: string | null;
  forceTooltipOpen?: boolean;
}) => {
  const [showCelebrationTooltip, setShowCelebrationTooltip] = useState(false);
  useEffect(() => {
    if (!forceTooltipOpen) {
      setShowCelebrationTooltip(false);
      return;
    }
    const revealMs = Math.max(0, parseFloat(fadeDelay) * 1000);
    const timer = setTimeout(() => setShowCelebrationTooltip(true), revealMs);
    return () => clearTimeout(timer);
  }, [forceTooltipOpen, fadeDelay]);
  const text = (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="middle"
      className={`${playfair.className} rvtree4-leaf`}
      style={{
        animationDelay: fadeDelay,
        transition: 'x 1100ms ease, y 1100ms ease, font-size 1100ms ease',
      }}
      fontSize={fontSize}
      fill={fill}
    >
      {name}
    </text>
  );
  if (!hovertext) return text;
  return (
    <Tooltip
      placement="top"
      maxWidth={280}
      styleManually
      forceOpen={showCelebrationTooltip}
      background="rgba(0, 0, 0, 0.9)"
      surfaceClassName={`${cormorant.className} whitespace-pre-wrap rounded-md border border-white/25 text-left text-[0.95rem] font-light italic tracking-[0.03em] text-[#e3e6eb]`}
      content={hovertext}
    >
      {text}
    </Tooltip>
  );
};

export default TapestryNameLabel;
