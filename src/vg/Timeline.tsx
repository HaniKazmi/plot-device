import { FormControlLabel, FormGroup, Switch } from "@mui/material";
import { Timeline as TimelineIcon } from "@mui/icons-material";
import { useState } from "react";
import { SectionHeader } from "../common/SectionHeader";
import { VideoGame, platformToColor } from "./types";
import Timeline, { TimelineData } from "../common/Timeline";
import { CURRENT_PLAINDATE, YearMonthDay } from "../common/date";
import { VgHoverCard } from "./CardMediaImage";
import { useScheme } from "../common/useScheme";
import { format } from "../utils/mathUtils";
import { spanKey } from "./cardData";

const VgTimeline = ({ data }: { data: VideoGame[] }) => {
  const scheme = useScheme();

  const [partyEnabled, setParty] = useState(false);

  const gameData: TimelineData[] = data
    .filter(({ party }) => partyEnabled || !party)
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
        // The bars actually drawn, which the Party switch and the chart's own 2015 floor both
        // narrow — so the figure answers for the picture rather than for the tab's filters.
        count={`${format(gameData.length)} games`}
        action={
          <FormGroup row>
            <FormControlLabel
              label="Party"
              control={
                <Switch
                  checked={partyEnabled}
                  onChange={(_, checked) => setParty(checked)}
                />
              }
            />
          </FormGroup>
        }
      />
    </Timeline>
  );
};

export default VgTimeline;
