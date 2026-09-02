import { History } from "@mui/icons-material";
import { StatBand } from "../common/SectionRail";
import { StatList } from "../common/Stats";
import { format } from "../utils/mathUtils";
import type { OmniItem } from "./adapter";
import OmniCardMediaImage from "./CardMediaImage";
import { omniLabels, omniMediumChip } from "./cardData";
import { useScheme } from "../common/useScheme";

/**
 * The last things finished, whatever they were.
 *
 * This is the list each of the three tabs keeps for itself, asked once across all of them — the
 * only place a season finished on Tuesday and a film seen on Wednesday appear in the order they
 * actually happened. The badge names the medium, since the artwork alone does not.
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
        chipComponent={(item) => omniMediumChip(item, scheme)}
        // Two full rows of the strip's own three-column layout, rather than the six a half-width
        // card holds: this one runs the whole width, so four cards land on a row and six leave the
        // second one half empty.
        collapsed={8}
        // Wider than a single-medium list runs, because half of these cards spend their width twice:
        // a poster seats its name beside itself, so a two-column cell leaves the name 74 pixels and
        // clamps every title in the run. Three columns give the picture and the words a column each.
        pictureWidth={[12, 6, 3]}
        dialogPictureWidth={[6, 4, 2]}
        divider
        MediaComponent={OmniCardMediaImage}
      />
    </StatBand>
  );
};

export default RecentlyFinished;
