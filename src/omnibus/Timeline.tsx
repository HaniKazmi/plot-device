import { useState, type ReactNode } from "react";
import { SegmentedControl, type SegmentOption, type YearDispatch } from "../common/SelectionComponents";
import { useColourBy } from "../common/useColourBy";
import { TimelineSection, type TimelineLayout } from "../common/TimelineSection";
import { stated } from "../common/population";
import { CURRENT_PLAINDATE, type YearNumber } from "../common/date";
import type { YearType } from "../common/filterReducer";
import type { OmniItem } from "../common/medium";
import type { PicturePress } from "../common/timelineLayout";
import OmniCardMediaImage, { OmniHoverCard } from "../app/CardMediaImage";
import { galleryColour, galleryValue } from "../app/galleryData";
import { omniFranchiseTimeline, omniSeriesTimeline, omniTimeline } from "./timelineData";

/**
 * What the union's timeline can be coloured by: the medium first, the one vocabulary a mixed row
 * carries meaning in, then the fields the gallery and the By year chart already cut the union by,
 * each read through `galleryValue` so a genre means the same thing on every surface of the page.
 */
const COLOUR_KEYS = ["medium", "genre", "certificate", "style", "franchise"] as const;

/**
 * What one mark stands for: an entry, or the group a set of entries is read as — a franchise across
 * all four media on the whole union, a series inside one franchise on a franchise's own page.
 */
type Mark = "entry" | "group";

/** What the grouped reading groups by. */
type Grouping = "franchise" | "series";

/** Each grouping's word, the population its marks are counted in, and how its marks are built. */
const GROUPINGS = {
  franchise: { label: "Franchises", noun: "franchises", timeline: omniFranchiseTimeline },
  series: { label: "Series", noun: "series", timeline: omniSeriesTimeline },
} as const;

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
 *
 * A franchise's own page draws the same section over that franchise's items, grouped by series
 * rather than by the franchise every one of them shares, with its own year scope and a control of
 * its own beside the section's.
 */
const OmniTimeline = (props: {
  data: OmniItem[];
  yearType: YearType;
  yearTo: YearNumber;
  /** What the grouped reading groups by; the franchise where nothing says otherwise. */
  grouping?: Grouping;
  /** Where a year label sends its scope: the page's own store. */
  dispatch: YearDispatch;
  title?: string;
  /** A control standing ahead of the section's own. */
  lead?: ReactNode;
  /** The layouts on offer, the first opening (`TimelineSection`). */
  layouts?: readonly TimelineLayout[];
}) => {
  const { data, yearType, yearTo } = props;
  const grouping = props.grouping ?? "franchise";
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
      : GROUPINGS[grouping].timeline(data, CURRENT_PLAINDATE, drawing);
  const marksOn: readonly SegmentOption<Mark>[] = [
    { value: "entry", label: "Entries" },
    { value: "group", label: GROUPINGS[grouping].label },
  ];

  return (
    <TimelineSection
      title={props.title ?? (mark === "entry" ? "Everything" : "Every franchise")}
      // A mark per group is a population nothing else on the page counts; a mark per entry is
      // the page's own, already on the rail's chip.
      count={mark === "group" ? stated(marks.length, GROUPINGS[grouping].noun) : undefined}
      data={marks}
      controls={
        <>
          {props.lead}
          {colour.control}
          <SegmentedControl
            options={marksOn}
            value={mark}
            onChange={setMark}
            ariaLabel="One mark per"
          />
        </>
      }
      colourKey={colour.colourKey(data)}
      yearType={yearType}
      yearTo={yearTo}
      dispatch={props.dispatch}
      // The widest of the four shapes, so a lane holds any of them: a poster beside a banner stands
      // in a lane that would have held a second banner.
      shape="banner"
      layouts={props.layouts}
    />
  );
};

export default OmniTimeline;
