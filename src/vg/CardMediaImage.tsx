import { CardContent, Typography } from "@mui/material";
import {
  CardPanel,
  type PanelStat,
  CardMediaImage,
  HeroStatRow,
  MetadataLedger,
  TimelineCard,
  TypedCardMediaImage,
  type CardStat,
  type LedgerRow,
} from "../common/Card";
import { VideoGame, companyToAccent, franchiseToColour, genreToColour, platformToColor, ratingToColour } from "./types";
import Grid from "@mui/material/Grid";
import { statusToColour } from "../utils/types";
import { CURRENT_PLAINDATE, Year, YearMonthDay, formatDate, formatDateRange } from "../common/date";
import { buildStrip, stripYearTicks } from "../common/timelineStripData";
import { gameSpans, spanKey } from "./cardData";
import { useFranchiseGames } from "./franchiseContext";

/**
 * The figures the card leads with. Each is conditional on the sheet holding it: an in-progress
 * game may have no hours logged, and a game logged with a bare year cannot be counted days into.
 *
 * Zero is unrecorded rather than a measurement in both, which is why the test is truthiness: a
 * tile reading zero hours says the game was played for none, where saying nothing says the truth.
 */
const gameStats = (game: VideoGame): CardStat[] => {
  const stats: CardStat[] = [];

  if (game.hours) stats.push({ label: "Hours", value: game.hours });
  if (game.numDays) stats.push({ label: "Days To Beat", value: game.numDays });
  stats.push({ label: "Status", value: game.status, colour: statusToColour(game) });

  return stats;
};

/**
 * The facts a ledger line carries, joined only where the sheet holds them. A blank part joined
 * unconditionally leaves the separator behind it — "12 May 2019 · " — which reads as a value that
 * failed to load rather than as one the sheet never had.
 */
const joinParts = (parts: (string | undefined)[]): string => parts.filter(Boolean).join(" · ");

/**
 * Everything else the sheet records, one fact per line, with related facts on the same line: a
 * release is a date and a format, and a game is made by a developer for a publisher.
 *
 * A swatch appears only where the colour is one the app already speaks — the platform's brand
 * accent is the badge in this card's own corner, and franchise, genre and rating each fill a ring
 * or a bar on the tab behind it. The rest are text, because inventing a colour for a publisher
 * teaches the reader a legend no chart honours.
 */
const gameRows = (game: VideoGame): LedgerRow[] => {
  const rows: LedgerRow[] = [
    { label: "Played", value: formatDateRange(game.startDate, game.endDate) },
    // The brand hex rather than the chart fill, on the same rule the corner chip follows: this is
    // a badge at a badge's size, not a value being compared against its neighbours.
    { label: "Platform", value: game.platform, swatch: companyToAccent(game) },
    { label: "Released", value: joinParts([formatDate(game.releaseDate), game.format]) },
  ];

  // One name where the studio published itself, rather than the same word twice.
  const by = joinParts([...new Set([game.developer, game.publisher])]);
  if (by) rows.push({ label: "By", value: by });

  if (game.franchise) {
    // Unknown franchises fall through to an empty colour, which is no swatch rather than a black
    // square standing for nothing.
    rows.push({ label: "Franchise", value: game.franchise, swatch: franchiseToColour(game) || undefined });
  }

  if (game.genre) {
    const themes = game.theme.filter(Boolean);
    rows.push({
      label: "Genre",
      value: joinParts([game.genre, themes.join(" – ")]),
      swatch: genreToColour(game),
    });
  }
  rows.push({ label: "PEGI", value: game.rating, swatch: ratingToColour(game) });

  return rows;
};

const VgCardMediaImage: TypedCardMediaImage<VideoGame> = ({ item, ...props }) => (
  <CardMediaImage
    alt={item.name}
    image={item.banner}
    detailComponent={() => (
      <CardContent>
        <Grid
          container
          spacing={1}
        >
          <VgTimelineCard item={item} />
          <HeroStatRow stats={gameStats(item)} />
          <MetadataLedger rows={gameRows(item)} />
        </Grid>
      </CardContent>
    )}
    {...props}
  />
);

const VG_EPOCH = YearMonthDay.get(2004, 1, 1);
const VG_TICKS = stripYearTicks(VG_EPOCH, CURRENT_PLAINDATE);

/**
 * The whole franchise, not just the game the card is about: a series played across a decade is
 * the thing the strip has to say, and the opened game is where in it you are.
 */
const VgTimelineCard = ({ item: game }: { item: VideoGame }) => {
  const franchise = useFranchiseGames(game);

  const { bands, laneCount } = buildStrip(gameSpans(franchise, CURRENT_PLAINDATE), VG_EPOCH, CURRENT_PLAINDATE);
  const subject = spanKey(game);

  if (bands.length === 0) return null;

  return (
    <TimelineCard
      bands={bands.map((band) => ({
        ...band,
        colour: platformToColor(band.game),
        muted: band.key !== subject,
        imprecise: !band.precise,
        tooltip: <GameTooltip game={band.game} />,
      }))}
      laneCount={laneCount}
      ticks={VG_TICKS}
      caption={
        franchise.length > 1 ? `${game.franchise} · ${franchise.length} games · ${VG_EPOCH.year} – today` : undefined
      }
    />
  );
};

const GameTooltip = ({ game }: { game: VideoGame }) => (
  <>
    <Typography
      variant="h6"
      align="center"
    >
      {game.name}
    </Typography>
    {game.startDate instanceof Year ? (
      // The year is all the sheet holds, so it is all this says. Where the band sits inside that
      // year is an estimate, and the caption is what stops it being read as a date.
      <>
        <Typography>Played in {formatDate(game.startDate)}</Typography>
        <Typography
          variant="caption"
          sx={{ opacity: 0.7 }}
        >
          No month recorded — placed by release date
        </Typography>
      </>
    ) : (
      <Typography>{formatDateRange(game.startDate, game.endDate)}</Typography>
    )}
    {game.numDays ? <Typography>{game.numDays} Days</Typography> : null}
    {game.hours ? <Typography>{game.hours} Hours</Typography> : null}
  </>
);

/**
 * The figures a hover card carries, each only where the sheet holds it. Zero is unrecorded rather
 * than a measurement, which is why the test is truthiness: a tile reading zero hours says the game
 * was played for none, where saying nothing says the truth.
 */
const gameHoverStats = ({ hours, numDays }: VideoGame): PanelStat[] => {
  const stats: PanelStat[] = [];

  if (hours) stats.push({ value: hours, label: "Hours" });
  if (numDays) stats.push({ value: numDays, label: "Days" });

  return stats;
};

/**
 * The card a hovered bar shows: the artwork, what the game is, when it ran, how much of it there
 * was.
 *
 * A component rather than a shape each chart assembles, because the Omnibus shows the same card for
 * a game and a second assembly of it is a second thing to keep in step — which is exactly what the
 * two surfaces failed to do. The subtitle is the pair the tab's hero says, so a game is named the
 * same way wherever it is promoted.
 */
export const VgHoverCard = ({ item }: { item: VideoGame }) => (
  <VgCardMediaImage
    item={item}
    extractColour
    footerComponent={
      <CardPanel
        title={item.name}
        subtitle={[{ text: item.platform }, { text: item.genre, swatch: genreToColour(item) }]}
        dateRange={formatDateRange(item.startDate, item.endDate)}
        stats={gameHoverStats(item)}
      />
    }
  />
);

export default VgCardMediaImage;
