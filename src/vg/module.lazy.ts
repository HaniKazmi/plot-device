import type { VideoGame } from "./types";

/**
 * The Games half a browse surface reaches for, behind the chunk that draws it.
 *
 * A registry keyed by medium is reachable from the shell, so anything named in `module.ts` lands
 * in the first bundle a visitor downloads. Cards and hover cards are deliberately not there, and
 * neither are the three accessors below: the gallery and the search palette are the only things
 * that ask them, and both already have a chunk of their own.
 */
export { default as CardMediaImage, VgHoverCard as HoverCard } from "./CardMediaImage";

/** A game is already one row per work, so the row itself is the work. */
export const work = (game: VideoGame): unknown => game;

export const secondaryText = (game: VideoGame) => [game.developer, game.platform];

export const facts = (game: VideoGame, hours: number) =>
  [game.platform, game.status, hours ? `${hours} hours` : ""].filter(Boolean).join(" · ");
