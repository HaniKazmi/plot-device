import { Timeline as TimelineIcon } from "@mui/icons-material";
import { useState } from "react";
import { SectionHeader } from "../common/SectionHeader";
import { SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import { format } from "../utils/mathUtils";
import { Season, Show } from "./types";
import Timeline, { TimelineData } from "../common/Timeline";
import { Colour, statusToColour } from "../utils/types";
import { CURRENT_PLAINDATE } from "../common/date";
import { ShowHoverCard } from "./CardMediaImage";
import { useScheme } from "../common/useScheme";

/** What one bar stands for: a season, or a show with its seasons combined. */
type Bar = "season" | "show";

const BARS: readonly SegmentOption<Bar>[] = [
  { value: "season", label: "Seasons" },
  { value: "show", label: "Shows" },
];

const ShowTimeline = ({ data }: { data: Show[] }) => {
  const scheme = useScheme();

  const [bar, setBar] = useState<Bar>("season");
  const groupData = bar === "show";

  const titleData: [string, Show | Season, Colour][] = groupData
    ? data.map((show) => [show.name, show, statusToColour(show, scheme)])
    : data.flatMap((show) =>
        show.s.map((s) => [`${show.name} - S${s.s}`, s, statusToColour(show, scheme)] as [string, Season, Colour]),
      );

  const showData: TimelineData[] = titleData.map(([title, s, colour]) => ({
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
    colour: colour,
    start: s.startDate,
    end: s.endDate ?? CURRENT_PLAINDATE,
  }));

  return (
    <Timeline data={showData}>
      <SectionHeader
        icon={<TimelineIcon />}
        title={groupData ? "Every show" : "Every season"}
        // The bars actually drawn, which the control beside it changes from one per season to one
        // per show — so the title and the count turn over with the bars rather than outliving them.
        count={`${format(titleData.length)} ${groupData ? "shows" : "seasons"}`}
        // The same control the charts' views and the wall's density are chosen with: "one bar per
        // season or per show" is the same kind of choice, a small closed set where the current one
        // has to be readable at a glance, and a switch labelled "Combine Seasons" states only the
        // one it is not on.
        action={
          <SegmentedControl
            options={BARS}
            value={bar}
            onChange={setBar}
            ariaLabel="One bar per"
          />
        }
      />
    </Timeline>
  );
};

export default ShowTimeline;
