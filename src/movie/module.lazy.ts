import { formatDate } from "../common/date";
import type { NowPanel } from "../common/medium";
import type { Scheme } from "../utils/types";
import { movieSubtitle } from "./cardData";
import { latestWatched, movieHeroStats } from "./statsData";
import type { Movie } from "./types";

/** The Movies card, hover card and Now band answers, behind the chunk that draws them. See `vg/module.lazy.ts`. */
export { default as CardMediaImage, MovieHoverCard as HoverCard } from "./CardMediaImage";

/** The film watched most recently: a film is finished as soon as it is started, so the latest is it. */
export const elect = (movies: Movie[]) => latestWatched(movies);

export const nowPanel = (movie: Movie, scheme: Scheme): NowPanel => ({
  kicker: formatDate(movie.startDate),
  date: formatDate(movie.startDate),
  title: movie.name,
  subtitle: movieSubtitle(movie, scheme),
  // One film, so the franchise count is one and its tile is dropped, as it is on the three cards
  // beside this one.
  stats: movieHeroStats(movie, 1),
});
