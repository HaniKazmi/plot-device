import { FormControlLabel, FormGroup, Switch } from "@mui/material";
import { Timeline as TimelineIcon } from "@mui/icons-material";
import { useState } from "react";
import { SectionHeader } from "../common/SectionHeader";
import { VideoGame, platformToColor } from "./types";
import Timeline, { TimelineData } from "../common/Timeline";
import { CURRENT_PLAINDATE, YearMonthDay, formatDateRange } from "../common/date";
import VgCardMediaImage from "./CardMediaImage";
import { CardPanel, type PanelStat } from "../common/Card";
import { format } from "../utils/mathUtils";

/**
 * The figures the hover card carries, each one only where the sheet holds it.
 *
 * Zero is unrecorded rather than a measurement in both — the same reading the expanded card's
 * hero tiles take — so a game with hours logged and no days still says its hours.
 */
const gameStats = ({ hours, numDays }: VideoGame): PanelStat[] => {
  const stats: PanelStat[] = [];

  if (hours) stats.push({ value: hours, label: "Hours" });
  if (numDays) stats.push({ value: numDays, label: "Days" });

  return stats;
};

const VgTimeline = ({ data }: { data: VideoGame[] }) => {
  const [partyEnabled, setParty] = useState(false);

  const gameData: TimelineData[] = data
    .filter(({ party }) => partyEnabled || !party)
    .filter(({ startDate }) => startDate instanceof YearMonthDay && startDate.year > 2014)
    .map((row) => ({
      name: row.name,
      tooltip: () => (
        <VgCardMediaImage
          item={row}
          extractColour
          footerComponent={
            <CardPanel
              title={row.name}
              dateRange={formatDateRange(row.startDate, row.endDate)}
              stats={gameStats(row)}
            />
          }
        />
      ),
      colour: platformToColor(row),
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
