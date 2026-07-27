import KnotTapestry from './KnotTapestry';
import TreeTapestry from './TreeTapestry';
import TreeV2Tapestry from './TreeV2Tapestry';
import TreeV3Tapestry from './TreeV3Tapestry';
import TreeV4Tapestry from './TreeV4Tapestry';
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
  if (variant === 'tree2') return <TreeV2Tapestry persons={persons} entrance={entrance} />;
  if (variant === 'tree3') return <TreeV3Tapestry persons={persons} entrance={entrance} />;
  if (variant === 'tree4') return <TreeV4Tapestry persons={persons} entrance={entrance} />;
  if (variant === 'wreath') return <WreathTapestry persons={persons} entrance={entrance} />;
  return <KnotTapestry persons={persons} entrance={entrance} />;
};

export default GuestTapestry;
