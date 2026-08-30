import { CardContent, Typography } from "@mui/material";
import {
  CardMediaImage,
  HeroStatRow,
  MetadataLedger,
  TimelineCard,
  TypedCardMediaImage,
  type CardStat,
  type LedgerRow,
} from "../common/Card";
import { Season, Show, isShow } from "./types";
import Grid from "@mui/material/Grid";
import { ageRatingToColour, statusToColour } from "../utils/types";
import { namesTheSameThing } from "../utils/stringUtils";
import { CURRENT_PLAINDATE, YearMonthDay, formatDateRange } from "../common/date";
import { buildStrip, stripYearTicks } from "../common/timelineStripData";

/** The figures the card leads with: how much of the show there is, and whether it is still going. */
const showStats = (show: Show): CardStat[] => [
  { label: "Episodes", value: show.e },
  { label: "Hours", value: Math.floor(show.minutes / 60) },
  { label: "Status", value: show.status, colour: statusToColour(show) },
];

/**
 * The facts that are not figures.
 *
 * Only the rating carries a swatch — it is the one of these the app colours anywhere else, so the
 * swatch names a legend the charts honour. Status has a colour too and is already a filled tile
 * above, so repeating it here would say it twice.
 */
const showRows = (show: Show): LedgerRow[] => {
  const rows: LedgerRow[] = [
    { label: "Watched", value: formatDateRange(show.startDate, show.endDate) },
    { label: "Last Watched", value: `S${show.s.length}E${show.s.at(-1)!.e}` },
    // The primary genre leads and the rest follow it, which is the order the sheet holds them in
    // and the order the charts group by.
    { label: "Genre", value: [show.genre, ...show.genres].join(" · ") },
    { label: "Network", value: show.network },
    { label: "Rating", value: show.rating, swatch: ageRatingToColour(show.rating) },
  ];

  // A show with no wider franchise carries its own name in the column, so the row appears only
  // where it names something the show belongs to rather than the show over again.
  if (!namesTheSameThing(show.franchise, show.name)) rows.push({ label: "Franchise", value: show.franchise });

  return rows;
};

const ShowCardMediaImage = <T extends Show | Season>({ item, ...props }: Parameters<TypedCardMediaImage<T>>[0]) => {
  const show = isShow(item) ? item : item.show;
  return (
    <CardMediaImage
      alt={show.name}
      image={show.banner}
      detailComponent={() => (
        <CardContent>
          <Grid
            container
            spacing={1}
          >
            <ShowTimelineCard item={show} />
            <HeroStatRow stats={showStats(show)} />
            <MetadataLedger rows={showRows(show)} />
          </Grid>
        </CardContent>
      )}
      {...props}
    />
  );
};

const SHOW_EPOCH = YearMonthDay.get(2008, 1, 1);
const SHOW_TICKS = stripYearTicks(SHOW_EPOCH, CURRENT_PLAINDATE);

const ShowTimelineCard = ({ item }: { item: Show }) => {
  const { bands, laneCount } = buildStrip(
    item.s.map((season) => ({
      key: `S${season.s}`,
      start: season.startDate,
      end: season.endDate ?? CURRENT_PLAINDATE,
      season,
    })),
    SHOW_EPOCH,
    CURRENT_PLAINDATE,
  );

  if (bands.length === 0) return null;

  return (
    <TimelineCard
      bands={bands.map((band, index) => ({
        ...band,
        // One hue in two strengths. Alternating across two palette colours makes adjacent seasons
        // distinguishable but reads as two different things being plotted.
        colour: index % 2 === 0 ? "secondary.light" : "secondary.main",
        tooltip: <SeasonTooltip season={band.season} />,
      }))}
      laneCount={laneCount}
      ticks={SHOW_TICKS}
      caption={`${item.name} · ${item.s.length} ${item.s.length === 1 ? "season" : "seasons"} · ${SHOW_EPOCH.year} – today`}
    />
  );
};

const SeasonTooltip = ({ season }: { season: Season }) => (
  <>
    <Typography
      variant="h6"
      align="center"
    >
      S{season.s}
    </Typography>
    <Typography>{formatDateRange(season.startDate, season.endDate)}</Typography>
    <Typography>{season.e} Episodes</Typography>
    <Typography>{Math.floor(season.minutes / 60)} Hours</Typography>
  </>
);

export default ShowCardMediaImage;
