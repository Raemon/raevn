import KnotTapestry from './KnotTapestry';
import TreeTapestry from './TreeTapestry';
import WreathTapestry from './WreathTapestry';
import type { TapestryEntrance, TapestryPerson, TapestryVariant } from './tapestryTypes';

// Compare all three arrangements side by side at /preview before choosing
// which one the live page renders. Every arrangement shows Ray and Elizabeth
// as its founding figures even when `persons` is empty.
const GuestTapestry = ({
  persons,
  variant,
  entrance = 'staggered',
}: {
  persons: TapestryPerson[];
  variant: TapestryVariant;
  entrance?: TapestryEntrance;
}) => {
  if (variant === 'tree') return <TreeTapestry persons={persons} entrance={entrance} />;
  if (variant === 'wreath') return <WreathTapestry persons={persons} entrance={entrance} />;
  return <KnotTapestry persons={persons} entrance={entrance} />;
};

export default GuestTapestry;
