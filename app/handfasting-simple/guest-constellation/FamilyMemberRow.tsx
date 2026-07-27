'use client';

import type { FamilyMemberDraft, MenuOptionPreview } from './partyRegistrationTypes';
import CelestialCheckbox from './CelestialCheckbox';
import DietChoiceTrio from './DietChoiceTrio';

const FamilyMemberRow = ({
  draft,
  menuOptions,
  onPatch,
  onDiscard,
}: {
  draft: FamilyMemberDraft;
  menuOptions: MenuOptionPreview[];
  onPatch: (patch: Partial<Omit<FamilyMemberDraft, 'draftKey'>>) => void;
  onDiscard: () => void;
}) => (
  <div className="flex w-full flex-col items-center gap-2 rounded-md border border-white/20 p-3">
    <div className="flex w-full items-center">
      <input
        type="text"
        value={draft.name}
        onChange={(inputEvent) => onPatch({ name: inputEvent.target.value })}
        placeholder="Family member's name..."
        autoComplete="off"
        className="w-full bg-transparent text-center p-2 rounded-sm outline-none border-none text-white/90"
      />
      <button
        type="button"
        aria-label={draft.name ? `Remove ${draft.name}` : 'Remove family member'}
        onClick={onDiscard}
        className="cursor-pointer border-none bg-transparent px-2 text-xl leading-none text-[#cbc4b3]"
      >
        ×
      </button>
    </div>
    <DietChoiceTrio diet={draft.diet} menuOptions={menuOptions} onDietChange={(diet) => onPatch({ diet })} />
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
      <CelestialCheckbox checked={draft.isChildUnder2} onChange={(checked) => onPatch({ isChildUnder2: checked })}>
        Child under 2
      </CelestialCheckbox>
      <CelestialCheckbox checked={draft.needsHighChair} onChange={(checked) => onPatch({ needsHighChair: checked })}>
        Needs a high chair
      </CelestialCheckbox>
    </div>
  </div>
);

export default FamilyMemberRow;
