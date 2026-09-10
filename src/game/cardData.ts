import { Year, YearMonthDay, formatDate, formatDateRange } from "../common/date";
import type { FranchiseEntry } from "../common/franchiseUnion";
import type { MediumSpan } from "../common/medium";
import type { ReactNode } from "react";
import type { LedgerRow, PanelSubtitlePart } from "../common/Card";
import { franchiseToColour, genreToColour, mediumFills, type Scheme } from "../utils/types";
import { companyToAccent, gameplayToColour, platformToColor, certificateColour, type VideoGame } from "./types";
import "../utils/arrayUtils";
import "../utils/mapUtils";

/**
 * What makes one span distinct. Name and platform alone collide on a replay, which would stack two
 * bands under one key.
 */
export const spanKey = (game: VideoGame) => `${game.name}-${game.platform}-${game.startDate}`;

/**
 * The same tuple under the medium's name, which is what identifies a game among the union of the
 * four libraries: the key a franchise strip finds the card's own game by, and the one the Omnibus
 * keys the game's row on, so the two cannot come to disagree.
 */
export const gameKey = (game: VideoGame) => `game-${spanKey(game)}`;

/**
 * How a game is named wherever it is promoted: where it was played, then the two vocabularies the
 * sheet records it under, each wearing the swatch its own ledger row and charts wear.
 *
 * Shared rather than assembled at each site, so the hero and the hover card cannot come to name one
 * game two ways. The Omnibus states its own two parts instead, because a Now card there names the
 * medium where this names the platform.
 */
export const gameSubtitle = (game: VideoGame, scheme: Scheme): PanelSubtitlePart[] => [
  // The platform wears the fill its wedge and its bar wear. A thumbnail says the platform in a
  // corner chip because it has no room for the word; a panel has the word, and the swatch is what
  // ties it to the charts.
  { text: game.platform, swatch: platformToColor(game, scheme) },
  { text: game.gameplay, swatch: gameplayToColour(game, scheme) },
  { text: game.genre, swatch: genreToColour(game.genre, scheme) },
];

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
 * accent is the badge in this card's own corner, and franchise, gameplay, genre and certificate each
 * fill a ring or a bar on the tab behind it. The rest are text, because inventing a colour for a
 * publisher teaches the reader a legend no chart honours.
 */
export const gameRows = (game: VideoGame, scheme: Scheme): LedgerRow[] => {
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
    rows.push({ label: "Franchise", value: game.franchise, swatch: franchiseToColour(game, scheme) || undefined });
  }

  // Pushed together because the pair is the point: how it is played, then what it is about.
  rows.push(
    { label: "Gameplay", value: game.gameplay, swatch: gameplayToColour(game, scheme) },
    { label: "Genre", value: game.genre, swatch: genreToColour(game.genre, scheme) },
  );

  // Themes get a line of their own rather than riding on either of the two above: they are the one
  // vocabulary here no chart on the tab colours, so a swatch would name a legend that does not
  // exist — and half of them read as genres, which would make the Gameplay line say two things.
  const themes = joinParts(game.themes);
  if (themes) rows.push({ label: "Themes", value: themes });

  rows.push({ label: "PEGI", value: game.certificate, swatch: certificateColour(game, scheme) });

  return rows;
};

/**
 * When a game ran, for any scale that places it: a card's franchise strip, a crossings lane, a
 * packed row.
 *
 * Half the collection predates the habit of logging days and carries a bare year, so what to do
 * with those is not an edge case. A year-only date spans its whole year with imprecise edges: the
 * strips dissolve such a span under a mask that says so, and the packed timeline leaves it out
 * (`game/Timeline.tsx`), a packed row having no way to mark a bar as an estimate. Sharing a year
 * out between the games naming it, in release order, would put each on a plausible slot — a game
 * cannot be played before it exists — but it needs the whole library to divide the year between
 * and reads as a date the sheet never held.
 */
export const gameSpan = (game: VideoGame, today: YearMonthDay): MediumSpan => ({
  start: game.startDate.firstDay(),
  // Still being played, whatever precision the start carries.
  end: game.endDate ? game.endDate.lastDay() : today,
  precise: !(game.startDate instanceof Year) && !(game.endDate instanceof Year),
});

/**
 * A game in a franchise strip's vocabulary. One mapper for the tab's own index and the union, so
 * the two cannot draw the same game two ways.
 */
export const gameEntry = (game: VideoGame, today: YearMonthDay, hoverCard: () => ReactNode): FranchiseEntry => ({
  key: gameKey(game),
  subject: gameKey(game),
  franchise: game.franchise,
  medium: "game",
  fill: mediumFills.game,
  label: game.name,
  ...gameSpan(game, today),
  hoverCard,
});
