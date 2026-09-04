import { CardPanel, CardMediaImage, CardDetailBody, TypedCardMediaImage, type CardStat } from "../common/Card";
import { cinemaLabel, scoreBand, scoreBandToColour, type Movie } from "./types";
import type { Scheme } from "../utils/types";
import { CURRENT_PLAINDATE, formatDate } from "../common/date";
import { hoverCardArtworkSx } from "../common/cardArrangement";
import { FranchiseStrip, type StripVariant } from "../common/FranchiseStrip";
import { useFranchiseUnion, type FranchiseEntry } from "../common/franchiseUnion";
import { movieEntry, movieRows, movieSubtitle } from "./cardData";
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
 * libraries have landed, through the mapper the union draws with.
 */
const movieEntries = (movies: Movie[]): FranchiseEntry[] =>
  movies.map((movie) => movieEntry(movie, () => <MovieHoverCard item={movie} />));

/**
 * The film's franchise across every medium it was met in, with this film as the subject; nothing
 * for a standalone. The union answers once all four libraries are here, and the tab's own index
 * answers until then.
 */
export const MovieFranchiseStrip = ({ movie, variant }: { movie: Movie; variant?: StripVariant }) => {
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
      variant={variant}
    />
  );
};

/**
 * The card a hovered mark shows: the artwork, what the film is, when it was seen, and its figures.
 *
 * A component rather than a shape each chart assembles, because the Omnibus shows the same card for
 * a film and a second assembly of it is a second thing to keep in step. A film's artwork is a 16:9
 * banner, so the card is the games card's arrangement — the panel under the picture — and not the
 * poster's, which seats the words beside it in a column a banner has no width to spare for. The
 * subtitle is the pair the tab's hero says, and the score is dropped where the film was never
 * scored rather than reading zero.
 */
export const MovieHoverCard = ({ item }: { item: Movie }) => {
  const scheme = useScheme();

  return (
    <MovieCardMediaImage
      item={item}
      extractColour
      sx={hoverCardArtworkSx("landscape")}
      footerComponent={
        <CardPanel
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
