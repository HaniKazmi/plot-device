import { CardPanel, CardMediaImage, CardDetailBody, TypedCardMediaImage, type CardStat } from "../common/Card";
import { cinemaLabel, scoreBand, scoreBandToColour, type Movie } from "./types";
import { mediumFills, type Scheme } from "../utils/types";
import { CURRENT_PLAINDATE, formatDate } from "../common/date";
import { hoverCardArtworkSx } from "../common/cardArrangement";
import { FranchiseStrip, type StripMode } from "../common/FranchiseStrip";
import { useFranchiseUnion, type FranchiseEntry } from "../common/franchiseUnion";
import { movieRows, movieSubtitle } from "./cardData";
import { useFranchiseMovies } from "./franchiseContext";
import { MOVIE_EPOCH, movieItemKey } from "./statsData";
import { useScheme } from "../common/useScheme";

/**
 * The figures the card leads with. The score takes the coloured tile — it is the one figure with
 * a colour vocabulary, so it wears the fill Status wears on the other tabs — and is dropped
 * entirely when the film was never scored: a tile reading 0/10 says something false where saying
 * nothing says the truth.
 */
const movieStats = (movie: Movie, scheme: Scheme): CardStat[] => [
  ...(movie.score !== undefined
    ? [{ label: "Score", value: `${movie.score}/10`, colour: scoreBandToColour(scoreBand(movie.score), scheme) }]
    : []),
  { label: "Minutes", value: movie.minutes },
  { label: "Seen in", value: cinemaLabel(movie) },
];

const MovieCardDetail = ({ item }: { item: Movie }) => {
  const scheme = useScheme();

  return (
    <CardDetailBody
      strip={<MovieFranchiseStrip movie={item} />}
      stats={movieStats(item, scheme)}
      rows={movieRows(item, scheme)}
    />
  );
};

const MovieCardMediaImage: TypedCardMediaImage<Movie> = ({ item, ...props }) => (
  <CardMediaImage
    alt={item.name}
    image={item.banner}
    detailComponent={() => <MovieCardDetail item={item} />}
    {...props}
  />
);

/**
 * The tab's own franchise in the strip's vocabulary, for the moment before the other three
 * libraries have landed. A film is a point — `start === end` — which the strip draws as a dot.
 */
const movieEntries = (movies: Movie[]): FranchiseEntry[] =>
  movies.map((movie) => ({
    key: movieItemKey(movie),
    subject: movieItemKey(movie),
    franchise: movie.franchise,
    medium: "movie",
    fill: mediumFills.movie,
    label: movie.name,
    start: movie.startDate,
    end: movie.startDate,
    precise: true,
    hoverCard: () => <MovieHoverCard item={movie} />,
  }));

/**
 * The film's franchise across every medium it was met in, with this film as the subject; nothing
 * for a standalone. The union answers once all four libraries are here, and the tab's own index
 * answers until then.
 */
export const MovieFranchiseStrip = ({ movie, mode }: { movie: Movie; mode?: StripMode }) => {
  const union = useFranchiseUnion(movie.franchise);
  const own = useFranchiseMovies(movie);
  const entries = union ?? movieEntries(own);

  if (entries.length < 2) return null;

  return (
    <FranchiseStrip
      entries={entries}
      subject={movieItemKey(movie)}
      franchise={movie.franchise}
      epoch={MOVIE_EPOCH}
      today={CURRENT_PLAINDATE}
      mode={mode}
    />
  );
};

/**
 * The card a hovered mark shows: the artwork, what the film is, when it was seen, and its figures.
 *
 * A component rather than a shape each chart assembles, because the Omnibus shows the same card for
 * a film and a second assembly of it is a second thing to keep in step. The subtitle is the pair the
 * tab's hero says, and the score is dropped where the film was never scored rather than reading zero.
 */
export const MovieHoverCard = ({ item }: { item: Movie }) => {
  const scheme = useScheme();

  return (
    <MovieCardMediaImage
      item={item}
      landscape
      extractColour
      sx={hoverCardArtworkSx("landscape")}
      footerComponent={
        <CardPanel
          layout="beside"
          title={item.name}
          subtitle={movieSubtitle(item, scheme)}
          dateRange={formatDate(item.startDate)}
          stats={[
            ...(item.score !== undefined ? [{ value: item.score, label: "Score" }] : []),
            { value: item.minutes, label: "Min" },
          ]}
        />
      }
    />
  );
};

export default MovieCardMediaImage;
