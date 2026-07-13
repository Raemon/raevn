'use client';

import CelestialCheckbox from './CelestialCheckbox';

// Vegan and vegetarian are mutually exclusive: checking one clears the other,
// so "both checked" never needs an interpretation.

const DietCheckboxPair = ({
  vegan,
  vegetarian,
  onDietChange,
}: {
  vegan: boolean;
  vegetarian: boolean;
  onDietChange: (next: { vegan: boolean; vegetarian: boolean }) => void;
}) => (
  <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
    <CelestialCheckbox
      checked={vegan}
      onChange={(checked) => onDietChange({ vegan: checked, vegetarian: checked ? false : vegetarian })}
    >
      Vegan
    </CelestialCheckbox>
    <CelestialCheckbox
      checked={vegetarian}
      onChange={(checked) => onDietChange({ vegetarian: checked, vegan: checked ? false : vegan })}
    >
      Vegetarian
    </CelestialCheckbox>
  </div>
);

export default DietCheckboxPair;
