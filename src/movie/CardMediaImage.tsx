import { CardContent, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  CardMediaImage,
  HeroStatRow,
  MetadataLedger,
  TimelineCard,
  TypedCardMediaImage,
  type CardStat,
  type LedgerRow,
} from "../common/Card";
import { cinemaLabel, scoreBand, scoreBandToColour, type Movie } from "./types";
import { ageRatingToColour, genreToColour } from "../utils/types";
import { namesTheSameThing } from "../utils/stringUtils";
import { CURRENT_PLAINDATE, YearMonthDay, formatDate } from "../common/date";
import { buildStrip, stripYearTicks } from "../common/timelineStripData";
import { gapLabel } from "./statsData";
import { useFranchiseMovies } from "./franchiseContext";

/**
 * The figures the card leads with. The score takes the coloured tile — it is the one figure with
 * a colour vocabulary, so it wears the fill Status wears on the other tabs — and is dropped
 * entirely when the film was never scored: a tile reading 0/10 says something false where saying
 * nothing says the truth.
 */
const movieStats = (movie: Movie): CardStat[] => [
  ...(movie.score !== undefined
    ? [{ label: "Score", value: `${movie.score}/10`, colour: scoreBandToColour(scoreBand(movie.score)) }]
    : []),
  { label: "Minutes", value: movie.minutes },
  { label: "Seen in", value: cinemaLabel(movie) },
];

/**
 * The facts that are not figures.
 *
 * A row carries a swatch exactly where the app speaks that field's colour somewhere else — the
 * genre shares the shows tab's vocabulary, the rating the games tab's map. The Waited row is the
 * release→watch gap in the reader's own units, and disappears where the watch predates the
 * release rather than reporting a negative wait.
 */
const movieRows = (movie: Movie): LedgerRow[] => {
  const rows: LedgerRow[] = [
    { label: "Watched", value: formatDate(movie.startDate) },
    { label: "Released", value: formatDate(movie.releaseDate) },
  ];

  const waited = gapLabel(movie);
  if (waited) rows.push({ label: "Waited", value: waited });

  rows.push(
    { label: "By", value: movie.director },
    // The primary genre leads and the rest follow it, which is the order the sheet holds them in
    // and the order the charts group by.
    { label: "Genre", value: [movie.genre, ...movie.genres].join(" · "), swatch: genreToColour(movie.genre) },
    { label: "Rating", value: movie.rating, swatch: ageRatingToColour(movie.rating) },
  );

  // A film with no wider franchise carries its own name in the column, so the row appears only
  // where it names something the film belongs to rather than the film over again.
  if (!namesTheSameThing(movie.franchise, movie.name)) rows.push({ label: "Franchise", value: movie.franchise });

  return rows;
};

const MovieCardMediaImage: TypedCardMediaImage<Movie> = ({ item, ...props }) => (
  <CardMediaImage
    alt={item.name}
    image={item.banner}
    detailComponent={() => (
      <CardContent>
        <Grid
          container
          spacing={1}
        >
          <MovieTimelineCard item={item} />
          <HeroStatRow stats={movieStats(item)} />
          <MetadataLedger rows={movieRows(item)} />
        </Grid>
      </CardContent>
    )}
    {...props}
  />
);

/** The earliest watch date in the sheet is late 1997, so the scale opens that January. */
const MOVIE_EPOCH = YearMonthDay.get(1997, 1, 1);
const MOVIE_TICKS = stripYearTicks(MOVIE_EPOCH, CURRENT_PLAINDATE);

/**
 * The franchise's watches on one strip — each film a mark at its watch date, the same point-event
 * handling the ribbon uses, so a series binge-watched in a week tiles into a visible block rather
 * than stacking. Standalone films get no strip at all: one mark on three decades says nothing.
 */
const MovieTimelineCard = ({ item }: { item: Movie }) => {
  const siblings = useFranchiseMovies(item);

  const { bands, laneCount } = buildStrip(
    siblings.map((movie) => ({
      key: `${movie.name}-${movie.startDate}`,
      start: movie.startDate,
      end: movie.startDate,
      movie,
    })),
    MOVIE_EPOCH,
    CURRENT_PLAINDATE,
  );

  if (siblings.length < 2 || bands.length === 0) return null;

  return (
    <TimelineCard
      bands={bands.map((band) => ({
        ...band,
        colour: genreToColour(band.movie.genre),
        muted: band.movie.name !== item.name,
        tooltip: <WatchTooltip movie={band.movie} />,
      }))}
      laneCount={laneCount}
      ticks={MOVIE_TICKS}
      caption={`${item.franchise} · ${siblings.length} films · ${MOVIE_EPOCH.year} – today`}
    />
  );
};

const WatchTooltip = ({ movie }: { movie: Movie }) => (
  <>
    <Typography
      variant="h6"
      align="center"
    >
      {movie.name}
    </Typography>
    <Typography>Watched {formatDate(movie.startDate)}</Typography>
    {movie.score !== undefined && <Typography>Scored {movie.score}/10</Typography>}
    <Typography>{movie.minutes} Minutes</Typography>
  </>
);

export default MovieCardMediaImage;
