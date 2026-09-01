import { CardContent, Typography } from "@mui/material";
import {
  CardPanel,
  CardMediaImage,
  HeroStatRow,
  MetadataLedger,
  TimelineCard,
  TypedCardMediaImage,
  type CardStat,
  type LedgerRow,
} from "../common/Card";
import { Season, Show, isShow, networkToColour } from "./types";
import Grid from "@mui/material/Grid";
import { ageRatingToColour, franchiseToColour, genreToColour, statusToColour, type Scheme } from "../utils/types";
import { useScheme } from "../common/useScheme";
import { namesTheSameThing } from "../utils/stringUtils";
import { CURRENT_PLAINDATE, YearMonthDay, formatDateRange } from "../common/date";
import { hoverCardArtworkSx } from "../common/cardArrangement";
import { buildStrip, stripYearTicks } from "../common/timelineStripData";
import { seasonSpans } from "./cardData";
import { useFranchiseShows } from "./franchiseContext";

/** The figures the card leads with: how much of the show there is, and whether it is still going. */
const showStats = (show: Show, scheme: Scheme): CardStat[] => [
  { label: "Seasons", value: show.s.length },
  { label: "Episodes", value: show.e },
  { label: "Hours", value: Math.floor(show.minutes / 60) },
  { label: "Status", value: show.status, colour: statusToColour(show, scheme) },
];

/**
 * The facts that are not figures.
 *
 * A row carries a swatch exactly where the app speaks that field's colour somewhere else — the
 * rating shares the games tab's map, the genre the vocabulary Movies shares, the network its own
 * table where it has an entry. Status has a colour too and is already a filled tile above, so
 * repeating it here would say it twice.
 */
const showRows = (show: Show, scheme: Scheme): LedgerRow[] => {
  const rows: LedgerRow[] = [
    { label: "Watched", value: formatDateRange(show.startDate, show.endDate) },
    // The latest season's own number, not the array length — the converter drops pre-2006
    // seasons, so a show with early seasons dropped holds fewer entries than its numbering.
    { label: "Last Watched", value: `S${show.s.at(-1)!.s}E${show.s.at(-1)!.e}` },
    // The primary genre leads and the rest follow it, which is the order the sheet holds them in
    // and the order the charts group by.
    { label: "Genre", value: [show.genre, ...show.genres].join(" · "), swatch: genreToColour(show.genre, scheme) },
    { label: "Network", value: show.network, swatch: networkToColour(show, scheme) || undefined },
    { label: "Rating", value: show.rating, swatch: ageRatingToColour(show.rating, scheme) },
  ];

  // The runtime of the most recent season's episodes — where the seasons disagree, the latest is
  // the one a reader deciding whether to start tonight is asking about.
  const episodeLength = show.s.at(-1)!.episodeLength;
  if (episodeLength) rows.push({ label: "Episode", value: `${episodeLength} min` });

  // A show with no wider franchise carries its own name in the column, so the row appears only
  // where it names something the show belongs to rather than the show over again.
  // Unknown franchises fall through to an empty colour, which is no swatch rather than a black
  // one — the table names the couple of dozen the app draws, not every series on the sheet.
  if (!namesTheSameThing(show.franchise, show.name))
    rows.push({ label: "Franchise", value: show.franchise, swatch: franchiseToColour(show, scheme) || undefined });

  return rows;
};

/**
 * A component rather than JSX inside the thunk, so the scheme is read where the body is built.
 * Reading it in the card itself would put a context subscription on every card of an uncapped
 * wall to serve the one that is open, which is the cost the thunk exists to avoid.
 */
const ShowCardDetail = ({ show }: { show: Show }) => {
  const scheme = useScheme();

  return (
    <CardContent>
      <Grid
        container
        spacing={1}
      >
        <ShowTimelineCard item={show} />
        <HeroStatRow stats={showStats(show, scheme)} />
        <MetadataLedger rows={showRows(show, scheme)} />
      </Grid>
    </CardContent>
  );
};

const ShowCardMediaImage = <T extends Show | Season>({ item, ...props }: Parameters<TypedCardMediaImage<T>>[0]) => {
  const show = isShow(item) ? item : item.show;

  return (
    <CardMediaImage
      alt={show.name}
      image={show.banner}
      detailComponent={() => <ShowCardDetail show={show} />}
      {...props}
    />
  );
};

const SHOW_EPOCH = YearMonthDay.get(2008, 1, 1);
const SHOW_TICKS = stripYearTicks(SHOW_EPOCH, CURRENT_PLAINDATE);

/**
 * A show in a franchise gets the whole series' seasons on one strip; a standalone show keeps its
 * own. The hook answers `[show]` for a standalone, so which mode a card takes is the same test
 * everywhere the index is read.
 */
const ShowTimelineCard = ({ item }: { item: Show }) => {
  const siblings = useFranchiseShows(item);
  return siblings.length > 1 ? (
    <FranchiseStrip
      show={item}
      siblings={siblings}
    />
  ) : (
    <SeasonStrip item={item} />
  );
};

/**
 * Every sibling's seasons, each band coloured by its own show's status — a vocabulary this tab
 * already speaks in the vitals band, the barchart's default grouping and the library's borders —
 * with every show but the card's own muted, the rule the games strip follows.
 */
const FranchiseStrip = ({ show, siblings }: { show: Show; siblings: Show[] }) => {
  const scheme = useScheme();

  const { bands, laneCount } = buildStrip(seasonSpans(siblings, CURRENT_PLAINDATE), SHOW_EPOCH, CURRENT_PLAINDATE);

  if (bands.length === 0) return null;

  const seasonCount = bands.length;
  return (
    <TimelineCard
      bands={bands.map((band) => ({
        ...band,
        colour: statusToColour(band.season.show, scheme),
        muted: band.season.show.name !== show.name,
        tooltip: (
          <SeasonTooltip
            season={band.season}
            named
          />
        ),
      }))}
      laneCount={laneCount}
      ticks={SHOW_TICKS}
      caption={`${show.franchise} · ${siblings.length} shows · ${seasonCount} seasons · ${SHOW_EPOCH.year} – today`}
    />
  );
};

const SeasonStrip = ({ item }: { item: Show }) => {
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

const SeasonTooltip = ({ season, named }: { season: Season; named?: boolean }) => (
  <>
    <Typography
      variant="h6"
      align="center"
    >
      {/* On a franchise strip every show has an S1, so the season alone does not say which. */}
      {named ? `${season.show.name} · S${season.s}` : `S${season.s}`}
    </Typography>
    <Typography>{formatDateRange(season.startDate, season.endDate)}</Typography>
    <Typography>{season.e} Episodes</Typography>
    <Typography>{Math.floor(season.minutes / 60)} Hours</Typography>
  </>
);

/**
 * The card a hovered bar shows: the artwork, what was watched, when, and how much of it.
 *
 * A component rather than a shape each chart assembles, because the Omnibus shows the same card for
 * a season and a second assembly of it is a second thing to keep in step. `title` is the chart's own
 * label for the bar, so the card names exactly what was hovered — a season, or a whole show where
 * the seasons are combined.
 *
 * The subtitle carries the season's own name where the sheet gives it one, then the pair the tab's
 * hero says. Parts with no text are dropped, so a season without a name of its own simply reads
 * network and genre.
 */
export const ShowHoverCard = <T extends Show | Season>({ item, title }: { item: T; title?: string }) => {
  const scheme = useScheme();

  const show = isShow(item) ? item : item.show;

  return (
    <ShowCardMediaImage
      item={item}
      landscape
      extractColour
      sx={hoverCardArtworkSx("portrait")}
      footerComponent={
        <CardPanel
          layout="beside"
          title={title ?? (isShow(item) ? item.name : `${show.name} S${item.s}`)}
          subtitle={[
            { text: isShow(item) ? "" : (item.subtitle ?? "") },
            { text: show.network },
            { text: show.genre, swatch: genreToColour(show.genre, scheme) },
          ]}
          dateRange={formatDateRange(item.startDate, item.endDate)}
          stats={[
            { value: item.e, label: "Eps" },
            { value: Math.round(item.minutes / 60), label: "Hours" },
          ]}
        />
      }
    />
  );
};

export default ShowCardMediaImage;
