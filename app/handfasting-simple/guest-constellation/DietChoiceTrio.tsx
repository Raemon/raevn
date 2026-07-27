'use client';

import { useId } from 'react';
import type { Diet } from '@prisma/client';
import { cormorant } from '../save-the-date/handfastingInvitationTypography';
import type { MenuOptionPreview } from './partyRegistrationTypes';

const DIET_CHOICES: { diet: Diet; label: string }[] = [
  { diet: 'vegetarian', label: 'Vegetarian' },
  { diet: 'vegan', label: 'Vegan' },
  { diet: 'omnivore', label: 'Omnivore' },
];

// Exactly one diet per guest, so these are radios; hovering (or keyboard-
// focusing) a choice previews that diet's dishes from the admin menu.

const DietChoiceTrio = ({
  diet,
  onDietChange,
  menuOptions,
}: {
  diet: Diet;
  onDietChange: (diet: Diet) => void;
  menuOptions: MenuOptionPreview[];
}) => {
  // Each guest row is its own radio group.
  const radioGroupName = useId();
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
      {DIET_CHOICES.map((choice) => {
        const dishes = menuOptions.filter((option) => option.diet === choice.diet);
        return (
          <span key={choice.diet} className="group relative">
            <label
              className={`${cormorant.className} flex cursor-pointer items-center gap-2 text-[clamp(0.95rem,1.6vw,1.15rem)] font-light italic tracking-[0.04em] text-[#cbc4b3]`}
            >
              <input
                type="radio"
                name={radioGroupName}
                checked={diet === choice.diet}
                onChange={() => onDietChange(choice.diet)}
                className="h-4 w-4 cursor-pointer accent-[#cbc4b3]"
              />
              <span>{choice.label}</span>
            </label>
            {dishes.length > 0 && (
              <div
                role="tooltip"
                className="pointer-events-none invisible absolute left-1/2 top-full z-10 mt-2 w-60 -translate-x-1/2 rounded-md border border-white/25 bg-black/90 p-3 text-left opacity-0 transition-opacity duration-150 motion-reduce:transition-none group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
              >
                {dishes.map((dish) => (
                  <div key={dish.name} className={`${cormorant.className} not-italic`}>
                    <p className="m-0 text-[1rem] tracking-[0.03em] text-[#e9e3d4]">{dish.name}</p>
                    {dish.description !== '' && (
                      <p className="m-0 mb-1 text-[0.85rem] font-light leading-snug text-[#cbc4b3]">
                        {dish.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
};

export default DietChoiceTrio;
