import { useState } from "react";
import { SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import { useColourBy } from "../common/useColourBy";
import { TimelineSection } from "../common/TimelineSection";
import { stated } from "../common/population";
import { CURRENT_PLAINDATE, type YearNumber } from "../common/date";
import type { YearType } from "../common/filterReducer";
import type { OmniItem } from "../common/medium";
import type { PicturePress } from "../common/timelineLayout";
import OmniCardMediaImage, { OmniHoverCard } from "../app/CardMediaImage";
import { galleryColour, galleryValue } from "../app/galleryData";
import { omniFranchiseTimeline, omniTimeline } from "./timelineData";
import { pageState } from "./filterUtils";

/**
 * What the union's timeline can be coloured by: the medium first, the one vocabulary a mixed row
 * carries meaning in, then the fields the gallery and the By year chart already cut the union by,
 * each read through `galleryValue` so a genre means the same thing on every surface of the page.
 */
const COLOUR_KEYS = ["medium", "genre", "certificate", "style", "franchise"] as const;

/** What one mark stands for: an entry, or a franchise across all four media. */
type Mark = "entry" | "franchise";

const MARKS: readonly SegmentOption<Mark>[] = [
  { value: "entry", label: "Entries" },
  { value: "franchise", label: "Franchises" },
];

const hoverCard = (item: OmniItem) => () => <OmniHoverCard item={item} />;

/** A picture at a height, in the shape its own tab draws it: the card sizes itself by its medium. */
const pictureOf = (item: OmniItem) => (height: number, press: PicturePress) => (
  <OmniCardMediaImage
    item={item}
    lazy
    sx={{ height, width: "auto" }}
    {...press}
  />
);

/**
 * The union on one timeline: every game, season, film and book as the tabs draw them one medium at
 * a time, or every franchise as one span across all four.
 */
const OmniTimeline = ({ data, yearType, yearTo }: { data: OmniItem[]; yearType: YearType; yearTo: YearNumber }) => {
  // A book has no certificate and no style and answers `""` under either, which takes the neutral
  // and stays out of the key, as books stay off those shelves.
  const colour = useColourBy(
    COLOUR_KEYS,
    "medium",
    (item: OmniItem, key, scheme) => {
      const value = galleryValue(item, key);
      return value ? galleryColour(value, key, scheme) : undefined;
    },
    galleryValue,
  );
  const [mark, setMark] = useState<Mark>("entry");

  const drawing = { colourOf: colour.fill, hoverCard, picture: pictureOf };
  const marks =
    mark === "entry"
      ? omniTimeline(data, CURRENT_PLAINDATE, drawing)
      : omniFranchiseTimeline(data, CURRENT_PLAINDATE, drawing);

  return (
    <TimelineSection
      title={mark === "entry" ? "Everything" : "Every franchise"}
      // A mark per franchise is a population nothing else on the page counts; a mark per entry is
      // the page's own, already on the rail's chip.
      count={mark === "franchise" ? stated(marks.length, "franchises") : undefined}
      data={marks}
      controls={
        <>
          {colour.control}
          <SegmentedControl
            options={MARKS}
            value={mark}
            onChange={setMark}
            ariaLabel="One mark per"
          />
        </>
      }
      colourKey={colour.colourKey(data)}
      yearType={yearType}
      yearTo={yearTo}
      dispatch={pageState.dispatch}
      // The widest of the four shapes, so a lane holds any of them: a poster beside a banner stands
      // in a lane that would have held a second banner.
      shape="banner"
    />
  );
};

export default OmniTimeline;
