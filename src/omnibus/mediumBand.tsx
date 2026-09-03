import type { MediaBand } from "../common/Card";
import type { Scheme } from "../utils/types";
import type { OmniItem } from "./adapter";
import { MEDIUM_LABEL_HEIGHT, MediumLabel } from "./MediumLabel";

/**
 * The band every mixed-media list wears, built once per list from the scheme it read. One
 * builder, so the shelves, their drill-downs and Recently Finished cannot come to draw the band at
 * different heights. In a file of its own because a file exporting a component is a hot-reload
 * boundary the lint rules hold to components alone.
 */
export const mediumBand = (scheme: Scheme): MediaBand<OmniItem> => ({
  render: (item) => (
    <MediumLabel
      medium={item.medium}
      scheme={scheme}
    />
  ),
  height: MEDIUM_LABEL_HEIGHT,
});
