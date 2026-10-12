import { useState } from "react";
import Sunburst, { SunBurstControls } from "../common/Sunburst";
import type { OmniItem } from "../common/medium";
import { useScheme } from "../common/useScheme";
import { galleryColour } from "../app/galleryData";
import type { Measure } from "../app/types";
import { printedHours } from "../utils/mathUtils";
import { omniTitle } from "./adapter";
import { franchiseRings, RING_LABELS, RINGS, ringValue } from "./franchiseSunburstData";

/**
 * One franchise's hours as a hierarchy: which media, which series inside each, which entries
 * inside those — the breakdown the page's figures and timeline state only in parts. Re-nestable
 * through the shell's own pickers, over the same keys the page's Top cards rank by.
 *
 * The first ring takes its vocabulary's colour where it has one — a medium's fill, a genre's — so
 * the wheel and the Media band beside the vitals draw one medium alike.
 */
const FranchiseSunburst = ({ items, measure }: { items: OmniItem[]; measure: Measure }) => {
  const scheme = useScheme();
  const [rings, setRings] = useState(() => franchiseRings(items));

  return (
    <Sunburst
      title={`Where the ${measure.toLowerCase()} went`}
      data={items}
      groups={rings}
      options={{
        keyToVal: ringValue,
        // Exact hours, the shell summing them and the printed figure floored as the vitals floor
        // theirs; an entry with no hours logged is left off rather than drawn as a zero wedge.
        getCount: (item) => (measure === "Hours" ? item.hours || undefined : 1),
        displayValue: measure === "Hours" ? printedHours : undefined,
        // A ring with a vocabulary wears it; a book on a style ring has no style to wear, and the
        // style table throws on the word its wedge is named by.
        getColor: (item, first) =>
          first === "series" || first === "where" || (first === "style" && !item.style)
            ? undefined
            : galleryColour(ringValue(item, first), first, scheme),
        getLeafName: omniTitle,
      }}
      controls={
        <SunBurstControls
          options={RINGS}
          controlStates={rings}
          setControlStates={setRings}
          labels={RING_LABELS}
        />
      }
    />
  );
};

export default FranchiseSunburst;
