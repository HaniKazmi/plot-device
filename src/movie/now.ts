import { formatDate } from "../common/date";
import type { NowModule, NowPanel } from "../common/medium";
import type { Scheme } from "../utils/types";
import { movieCredit } from "./cardData";
import { latestWatched, movieHeroStats } from "./statsData";
import type { Movie } from "./types";

/** The film watched most recently: a film is finished as soon as it is started, so the latest is it. */
const elect = (movies: Movie[]) => latestWatched(movies);

const nowPanel = (movie: Movie, scheme: Scheme): NowPanel => ({
  kicker: formatDate(movie.startDate),
  date: formatDate(movie.startDate),
  title: movie.name,
  subtitle: movieCredit(movie, scheme),
  stats: movieHeroStats(movie),
});

/**
 * This medium's Now band answers, stated as one typed pair so the election and the panel are
 * checked against the same record here, where `MediumLazy` erases it. Pure, so a test can run the
 * pair as the band runs it, without the card tree `module.lazy.ts` also carries.
 */
export const now: NowModule<Movie> = { elect, nowPanel };
