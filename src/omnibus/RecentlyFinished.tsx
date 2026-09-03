import { History } from "@mui/icons-material";
import { StatBand } from "../common/SectionRail";
import { StatList } from "../common/Stats";
import { format } from "../utils/mathUtils";
import type { OmniItem } from "./adapter";
import OmniCardMediaImage from "./CardMediaImage";
import { MIXED_CARD_SIZING, omniLabels } from "./cardData";
import { mediumBand } from "./mediumBand";
import { useScheme } from "../common/useScheme";

/**
 * The last things finished, whatever they were.
 *
 * This is the list each of the four tabs keeps for itself, asked once across all of them — the
 * only place a season finished on Tuesday and a film seen on Wednesday appear in the order they
 * actually happened. The band under each picture names the medium, since the artwork alone does
 * not, and it is the same band the gallery's shelves draw.
 *
 * The strip is capped where every card strip in the app is, and expanding lifts the cap to the
 * dialog's own. Over three libraries the run can outrun that too, so the header states how many of
 * it are drawn — the way the crossings and the gallery state theirs — rather than letting the cut
 * pass as the whole list.
 */
const RecentlyFinished = ({ items }: { items: OmniItem[] }) => {
  const scheme = useScheme();

  return (
    <StatBand>
      <StatList
        icon={<History />}
        title="Recently Finished"
        content={items}
        count={(shown, total) => (shown < total ? `${format(shown)} of ${format(total)}` : format(total))}
        // Full width: a mixed row is read across, and half a row of it beside another card would
        // hold three cards where the strip's whole point is the run.
        width={[12, 12, 12]}
        // The key a card is identified by, so a show's seasons and a film's rewatches stay distinct
        // — the name alone repeats across both.
        nameComponent={(item) => item.key}
        labelComponent={omniLabels}
        band={mediumBand(scheme)}
        // One card size for a run mixing all four shapes, the words giving way to the picture as
        // they do in the Now band.
        rowSizing={MIXED_CARD_SIZING}
        // Two rows, however many the width fits on each: five at the widest container, fewer as it
        // narrows. A cap in cards would leave the second row part-filled at most widths.
        collapsedRows={2}
        divider
        MediaComponent={OmniCardMediaImage}
      />
    </StatBand>
  );
};

export default RecentlyFinished;
