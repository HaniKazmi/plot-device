import { Timeline as TimelineIcon } from "@mui/icons-material";
import { useState } from "react";
import { SectionHeader } from "../common/SectionHeader";
import { SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import { VideoGame, platformToColor } from "./types";
import Timeline, { TimelineData } from "../common/Timeline";
import { CURRENT_PLAINDATE, YearMonthDay } from "../common/date";
import { VgHoverCard } from "./CardMediaImage";
import { useScheme } from "../common/useScheme";
import { format } from "../utils/mathUtils";
import { spanKey } from "./cardData";

/** Whether a party game earns its own row on the packed timeline, or is left off it. */
type PartyOption = "with" | "without";

const PARTY_OPTIONS: readonly SegmentOption<PartyOption>[] = [
  { value: "with", label: "With party" },
  { value: "without", label: "Without" },
];

const VgTimeline = ({ data }: { data: VideoGame[] }) => {
  const scheme = useScheme();

  // Opens on Without: the toggle is this chart's own, not the tab's filter drawer, so a party game
  // stays counted everywhere else on the tab and is only left off its own row here until asked for.
  const [partyOption, setPartyOption] = useState<PartyOption>("without");

  const gameData: TimelineData[] = data
    .filter(({ party }) => partyOption === "with" || !party)
    .filter(({ startDate }) => startDate instanceof YearMonthDay && startDate.year > 2014)
    .map((row) => ({
      // The strip's own identity for a game, which already carries the platform and the start date
      // because a replay and a cross-platform second copy both repeat the title exactly.
      key: spanKey(row),
      name: row.name,
      tooltip: () => <VgHoverCard item={row} />,
      colour: platformToColor(row, scheme),
      start: row.startDate as YearMonthDay,
      end: (row.endDate as YearMonthDay | undefined) ?? CURRENT_PLAINDATE,
    }));
  return (
    <Timeline data={gameData}>
      <SectionHeader
        icon={<TimelineIcon />}
        title="Every playthrough"
        // The bars actually drawn, which the Party control and the chart's own 2015 floor both
        // narrow — so the figure answers for the picture rather than for the tab's filters.
        count={`${format(gameData.length)} games`}
        action={
          <SegmentedControl
            options={PARTY_OPTIONS}
            value={partyOption}
            onChange={setPartyOption}
            ariaLabel="Party games"
          />
        }
      />
    </Timeline>
  );
};

export default VgTimeline;
