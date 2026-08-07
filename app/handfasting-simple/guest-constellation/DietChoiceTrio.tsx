'use client';

import { useId } from 'react';
import type { Diet } from '@prisma/client';
import { Tooltip } from '../../handfasting/Tooltip';
import { cormorant } from '../save-the-date/handfastingInvitationTypography';
import type { MenuOptionPreview } from './partyRegistrationTypes';

const DIET_CHOICES: { diet: Diet; label: string }[] = [
  { diet: 'vegetarian', label: 'Vegetarian' },
  { diet: 'vegan', label: 'Vegan' },
  { diet: 'omnivore', label: 'Omnivore' },
];

// Exactly one diet per guest, so these are radios — but none starts checked:
// diet is null until the guest picks. Hovering (or keyboard-focusing) a choice
// previews that diet's dishes from the admin menu.

const DietChoiceTrio = ({
  diet,
  onDietChange,
  menuOptions,
}: {
  diet: Diet | null;
  onDietChange: (diet: Diet) => void;
  menuOptions: MenuOptionPreview[];
}) => {
  // Each guest row is its own radio group.
  const radioGroupName = useId();
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
      {DIET_CHOICES.map((choice) => {
        const dishes = menuOptions.filter((option) => option.diet === choice.diet);
        const label = (
          <label
            className={`${cormorant.className} flex cursor-pointer items-center gap-2 text-[clamp(0.95rem,1.6vw,1.15rem)] font-light italic tracking-[0.04em] text-[#c2c6cd]`}
          >
            <input
              type="radio"
              name={radioGroupName}
              checked={diet === choice.diet}
              onChange={() => onDietChange(choice.diet)}
              className="h-4 w-4 cursor-pointer accent-[#c2c6cd]"
            />
            <span>{choice.label}</span>
          </label>
        );
        if (dishes.length === 0) return <span key={choice.diet}>{label}</span>;
        return (
          <Tooltip
            key={choice.diet}
            placement="bottom"
            maxWidth={240}
            styleManually
            background="rgba(0, 0, 0, 0.9)"
            surfaceClassName="rounded-md border border-white/25 text-left"
            content={dishes.map((dish) => (
              <div key={dish.name} className={`${cormorant.className} not-italic`}>
                <p className="m-0 text-[1rem] tracking-[0.03em] text-[#e3e6eb]">{dish.name}</p>
                {dish.description !== '' && (
                  <p className="m-0 mb-1 text-[0.85rem] font-light leading-snug text-[#c2c6cd]">
                    {dish.description}
                  </p>
                )}
              </div>
            ))}
          >
            {label}
          </Tooltip>
        );
      })}
    </div>
  );
};

export default DietChoiceTrio;
