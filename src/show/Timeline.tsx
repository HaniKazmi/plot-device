import { useState } from "react";
import { SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import { useColourBy } from "../common/useColourBy";
import { TimelineSection, type TimelineLayout } from "../common/TimelineSection";
import { stated } from "../common/population";
import { groupToColour, Season, Show } from "./types";
import type { PicturePress, TimelineData } from "../common/timelineLayout";
import { CURRENT_PLAINDATE, type YearNumber } from "../common/date";
import { pictureAtHeight } from "../common/cardArrangement";
import type { YearType } from "../common/filterReducer";
import ShowCardMediaImage, { ShowHoverCard } from "./CardMediaImage";
import { pageState } from "./filterUtils";

/**
 * Every layout but Pictures: every season wears its show's one poster, so the clock would be the
 * same picture repeated along each show's run.
 */
const LAYOUTS: readonly TimelineLayout[] = ["Across", "Stacked", "Grid"];

/**
 * What the timeline can be coloured by: every key the tab's own `groupToColour` answers, status
 * first, as the wall's border and the status band draw a show.
 */
const COLOUR_KEYS = ["status", "genre", "network", "certificate", "style", "franchise"] as const;

/** What one bar stands for: a season, or a show with its seasons combined. */
type Bar = "season" | "show";

const BARS: readonly SegmentOption<Bar>[] = [
  { value: "season", label: "Seasons" },
  { value: "show", label: "Shows" },
];

const pictureOf = (item: Show | Season) => (height: number, press: PicturePress) => (
  <ShowCardMediaImage
    item={item}
    lazy
    sx={pictureAtHeight("poster", height)}
    {...press}
  />
);

const ShowTimeline = ({ data, yearType, yearTo }: { data: Show[]; yearType: YearType; yearTo: YearNumber }) => {
  // Every key colours the show: a season inherits its show's genre, network, certificate, style and
  // franchise, and its status is the show's.
  const colour = useColourBy(
    COLOUR_KEYS,
    "status",
    (show: Show, key, scheme) => groupToColour(key, show, scheme),
    (show, key) => String(show[key]),
  );
  const [bar, setBar] = useState<Bar>("season");
  const groupData = bar === "show";

  const titleData: [string, Show | Season, Show][] = groupData
    ? data.map((show) => [show.name, show, show])
    : data.flatMap((show) => show.s.map((s) => [`${show.name} - S${s.s}`, s, show] as [string, Season, Show]));

  const showData: TimelineData[] = titleData.map(([title, s, show]) => ({
    // The season's own start as well as the title: under the per-show grouping every season of one
    // show shares a title, and two shows can share a season number and a name besides.
    key: `${title}-${s.startDate}`,
    name: title,
    tooltip: () => (
      <ShowHoverCard
        item={s}
        title={title}
      />
    ),
    colour: colour.fill(show),
    start: s.startDate,
    end: s.endDate ?? CURRENT_PLAINDATE,
    open: !s.endDate,
    picture: pictureOf(s),
  }));

  return (
    <TimelineSection
      title={groupData ? "Every show" : "Every season"}
      // Seasons alone. The count is here to say what the chart is over where that is not what the
      // page is over, and a bar per season is a population no other surface on the tab states —
      // where a bar per show is the tab's own, already on the rail's chip.
      count={groupData ? undefined : stated(titleData.length, "seasons")}
      data={showData}
      controls={
        <>
          <SegmentedControl
            options={BARS}
            value={bar}
            onChange={setBar}
            ariaLabel="One bar per"
          />
        </>
      }
      colourKey={colour.colourKey(data)}
      yearType={yearType}
      yearTo={yearTo}
      dispatch={pageState.dispatch}
      layouts={LAYOUTS}
      shape="poster"
    />
  );
};

export default ShowTimeline;
