import { Timeline as TimelineIcon } from "@mui/icons-material";
import { SectionHeader } from "../common/SectionHeader";
import { VideoGame, platformToColor } from "./types";
import Timeline, { TimelineData } from "../common/Timeline";
import { CURRENT_PLAINDATE } from "../common/date";
import { GameHoverCard } from "./CardMediaImage";
import { useScheme } from "../common/useScheme";
import { spanKey } from "./cardData";

const GameTimeline = ({ data }: { data: VideoGame[] }) => {
  const scheme = useScheme();

  const gameData: TimelineData[] = data.map((row) => ({
    // The strip's own identity for a game, which already carries the platform and the start date
    // because a replay and a cross-platform second copy both repeat the title exactly.
    key: spanKey(row),
    name: row.name,
    tooltip: () => <GameHoverCard item={row} />,
    colour: platformToColor(row, scheme),
    start: row.startDate,
    end: row.endDate ?? CURRENT_PLAINDATE,
  }));
  return (
    <Timeline data={gameData}>
      <SectionHeader
        icon={<TimelineIcon />}
        title="Every playthrough"
      />
    </Timeline>
  );
};

export default GameTimeline;
