import { PlainDate, YearMonthDay } from "../common/date.ts";
import type { Season, Show, Status } from "./types";
import "../utils/arrayUtils";

// Season.show is a back-reference to its parent, so it has to be dropped before serialising
// — otherwise JSON.stringify recurses forever — and re-attached after parsing.
export const dropSeasonParents = (key: string, value: unknown) => (key === "show" ? undefined : value);
export const reviveSeasonParents = (shows: Show[]) => shows.forEach((show) => show.s.forEach((s) => (s.show = show)));

export const jsonConverter = (json: Record<string, string>[]) => {
  const showData: Show[] = [];
  json.reduce((show, row) => {
    if (row.Show !== "") {
      show = {
        name: row.Show,
        status: row.Status as Status,
        anime: row.Anime === "TRUE",
        banner: row.Banner,
        s: [],
      };
      showData.push(show as Show);
    } else {
      const season: Partial<Season> = {
        s: parseFloat(row.Season),
        e: parseInt(row.Episode),
        subtitle: row.Subtitle,
        startDate: PlainDate.from(row.Start) as YearMonthDay,
        endDate: row.End ? (PlainDate.from(row.End) as YearMonthDay) : undefined,
        episodeLength: row.Episodes ? parseInt(row.Episodes) : undefined,
        show: show as Show,
      };

      season.minutes = season.episodeLength ? season.episodeLength * season.e! : 0;
      if (season.startDate && season.startDate.year > 2005) {
        show.s!.push(season as Season);
      }
      if (season.startDate && season.endDate) {
        console.assert(season.startDate <= season.endDate, "Dates are wrong", season);
      }
    }

    return show;
  }, {} as Partial<Show>);

  showData.forEach((show) => {
    show.startDate = show.s[0].startDate;
    show.endDate = show.s.at(-1)?.endDate;
    show.e = show.s.sum("e");
    show.minutes = show.s.sum("minutes");
    if (show.startDate && show.endDate) {
      console.assert(show.startDate <= show.endDate, "Dates are wrong", show);
    }
  });

  return showData;
};
