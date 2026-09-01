import { assignPercents } from "../utils/mathUtils";
import type { OmniItem } from "./adapter";
import { media, type Medium } from "./types";
import "../utils/arrayUtils";
import "../utils/mapUtils";

/** One medium's slice of a genre's hours. */
export interface GenreBridgeSegment {
  medium: Medium;
  hours: number;
  percent: number;
}

export interface GenreBridgeRow {
  genre: string;
  /** Hours across every medium in the row, floored once the way every total on this tab is. */
  hours: number;
  /** In the page's medium order, and only the media that actually logged hours here. */
  segments: GenreBridgeSegment[];
}

/**
 * Where a genre is watched or played, as each medium's share of the genre's hours.
 *
 * Hours rather than the page's active measure. The row is a composition and the measure is what
 * makes the three media comparable at all — under Items a two-hour film weighs the same as a
 * hundred-hour game, and a bar built from that says a genre is mostly films whenever the films are
 * short. The Media band above already answers the page in whichever measure is selected.
 *
 * Only the primary genre counts. Shows and Movies carry secondary genres and Games carry themes
 * instead, so folding the secondaries in would give two of the three media a second vote each.
 *
 * All three sheets record the same genre vocabulary, so a genre meets itself across media without
 * a mapping written here — which is what this chart needs to be true, since a row is exactly the
 * claim that one genre name spans more than one medium. A vocabulary of its own on any sheet would
 * make every one of its genres a single-medium row and drop them all at the filter below.
 */
export const genreBridge = (items: OmniItem[]): GenreBridgeRow[] => {
  const byGenre = items.reduce((index, item) => {
    if (item.genre) index.setIfAbsent(item.genre, []).push(item);
    return index;
  }, new Map<string, OmniItem[]>());

  return [...byGenre.entries()]
    .map(([genre, group]) => {
      // A medium with no hours in the genre gets no segment: `assignPercents` floors every slice at
      // half a percent so it stays visible, and a visible slice of nothing is a claim the data does
      // not make.
      const counts = media
        .map((medium) => ({ medium, count: group.filter((item) => item.medium === medium).sum("hours") }))
        .filter(({ count }) => count > 0);

      return {
        genre,
        hours: Math.floor(counts.sum("count")),
        segments: assignPercents(counts, counts.sum("count")).map(({ medium, count, percent }) => ({
          medium,
          hours: Math.floor(count),
          percent,
        })),
      };
    })
    .filter((row) => row.segments.length > 1)
    .sortByKey("hours");
};
