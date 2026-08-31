import { History } from "@mui/icons-material";
import { StatBand } from "../common/SectionRail";
import { StatList } from "../common/Stats";
import { omniKey, type OmniItem } from "./adapter";
import OmniCardMediaImage from "./CardMediaImage";
import { omniLabels, omniMediumChip } from "./cardData";

/**
 * The last things finished, whatever they were.
 *
 * This is the list each of the three tabs keeps for itself, asked once across all of them — the
 * only place a season finished on Tuesday and a film seen on Wednesday appear in the order they
 * actually happened. The badge names the medium, since the artwork alone does not, and the strip
 * expands to the whole run rather than only the six the card holds.
 */
const RecentlyFinished = ({ items }: { items: OmniItem[] }) => (
  <StatBand>
    <StatList
      icon={<History />}
      title="Recently Finished"
      content={items}
      // Full width: a mixed row is read across, and half a row of it beside another card would
      // hold three cards where the strip's whole point is the run.
      width={[12, 12, 12]}
      // The key a card is identified by, so a show's seasons and a film's rewatches stay distinct
      // — the name alone repeats across both.
      nameComponent={omniKey}
      labelComponent={omniLabels}
      chipComponent={omniMediumChip}
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

export default RecentlyFinished;
