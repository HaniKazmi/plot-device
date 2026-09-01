import { Timeline as TimelineIcon } from "@mui/icons-material";
import Grid from "@mui/material/Grid";
import { SectionHeader } from "../common/SectionHeader";
import { EventRibbon } from "../common/EventRibbon";
import { LazyTooltip } from "../common/LazyTooltip";
import { buildTicks } from "../common/timelineLayout";
import { YearMonth, shortYear } from "../common/date";
import { useSelectBox } from "../common/SelectBoxHook";
import { format } from "../utils/mathUtils";
import { groupToColour, type Movie } from "./types";
import { watchRibbonYears } from "./watchTimelineData";
import { MovieHoverCard } from "./CardMediaImage";
import { useScheme } from "../common/useScheme";

/**
 * Every row is the same 1 January – 31 December, so the months are walked once for all of them —
 * the year is arbitrary as long as it is not a leap year, or every row would carry February a
 * day wide of where its own February falls.
 */
const RIBBON_TICKS = buildTicks(YearMonth.get(2001, 1), YearMonth.get(2001, 12), 365);

const colourOptions = ["genre", "rating", "cinema", "decade", "score"] as const;

const WatchTimeline = ({ data }: { data: Movie[] }) => {
  const scheme = useScheme();

  const [colourBy, controls] = useSelectBox(colourOptions, "genre");

  const rows = watchRibbonYears(data).map(({ year, bands, laneCount }) => ({
    key: String(year),
    label: shortYear(year),
    laneCount,
    bands: bands.map((band) => ({
      ...band,
      // Every colour option here has a total vocabulary, so a mark is never left uncoloured.
      colour: groupToColour(colourBy, band.movie, scheme),
      hoverCard: true,
      tooltip: <LazyTooltip render={() => <MovieHoverCard item={band.movie} />} />,
    })),
  }));

  return (
    <Grid size={12}>
      <EventRibbon
        rows={rows}
        ticks={RIBBON_TICKS}
      >
        <SectionHeader
          icon={<TimelineIcon />}
          title="When films were watched"
          count={`${format(data.length)} films`}
          action={controls}
        />
      </EventRibbon>
    </Grid>
  );
};

export default WatchTimeline;
