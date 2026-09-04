import { alpha } from "@mui/material/styles";
import { useTheme, type Theme } from "@mui/material";
import { createContext, useContext } from "react";
import type { Colour } from "../utils/types";

/**
 * The seam's own width, exported because a surface that states its height in pixels has to count
 * it: the seam is a border, so it is part of the box a card measured its layout from.
 */
export const SEAM_WIDTH = 3;
/** Of the ground's own contrast colour: the secondary tone, the seam, and a tile's lift. */
const MUTED_ALPHA = 0.72;
const SEAM_ALPHA = 0.22;
const TILE_ALPHA = 0.1;

/**
 * Every palette built so far, by the two things one is derived from.
 *
 * The recipe is a pure function of the accent and the theme, and one card asks it nine times over —
 * the image, the panel, each tile, each ledger row, the strip — while a drill-down mounts five
 * hundred cards. Each miss costs a `getContrastText` and three `alpha` calls, every one of them
 * parsing a colour string.
 *
 * Keyed on the theme first, and weakly: `Google.tsx` holds one theme per tab for the life of the
 * page, so the outer entry is bounded by the number of tabs and goes when a theme does. That the
 * theme is the whole of the rest of the key is what `cssVariables: true` buys — `theme.vars` values
 * are `var()` references, so a scheme flip turns over in CSS and not here.
 */
const PALETTES = new WeakMap<Theme, Map<string, ReturnType<typeof buildPalette>>>();

/**
 * The key an accent-less palette is held under.
 *
 * Not `""`, which is a value an accent can actually take: colour lookups answer the empty string
 * off their tables, and `buildPalette` reads that as a ground while treating it as absent
 * everywhere else — an internally inconsistent palette. Keyed alike, one such call would serve it
 * to every uncoloured card in the theme for the life of the page.
 */
const NO_ACCENT = Symbol.for("artworkPalette.none").toString();

export const artworkPalette = (accent: Colour | undefined, theme: Theme) => {
  let byAccent = PALETTES.get(theme);
  if (!byAccent) {
    byAccent = new Map<string, ReturnType<typeof buildPalette>>();
    PALETTES.set(theme, byAccent);
  }

  // Not `setIfAbsent`, which takes the value rather than a way of making one: it would build the
  // palette on every call and then throw it away on a hit, which is the whole cost being avoided.
  const key = accent || NO_ACCENT;
  const built = byAccent.get(key);
  if (built) return built;

  const palette = buildPalette(accent || undefined, theme);
  byAccent.set(key, palette);
  return palette;
};

/**
 * One hue in three tones, derived from a colour sampled off artwork. Every surface that carries a
 * sampled colour takes its ground, its type and its accent from here, so a thumbnail's strip and
 * the hover card above it are the same recipe rather than two treatments that happen to rhyme.
 *
 * The ground is the sample exactly, because that is what ties a surface to the art beside it.
 * Sampling holds anything between luma 30 and 230, so which of black and white can be read on it
 * changes from card to card — the type is therefore derived from the ground rather than fixed, and
 * turns over with it.
 *
 * The other two tones are that same contrast colour made transparent. Over a coloured ground it
 * composites to a tint of the ground's own hue, which is what a secondary tone wants to be: grey
 * against a coloured surface reads as dead where the surface's own hue reads as chosen. Mixing the
 * two by hand lands in the same place and has to be told which way to mix.
 */
const buildPalette = (accent: Colour | undefined, theme: Theme) => {
  // Extraction arrives seconds after the page, and sometimes not until a reload, so the
  // colourless state is the one every card paints first. Filling the same shape from the theme
  // keeps it inside the recipe: a surface reads `palette.muted` and never asks whether there is a
  // palette to read, which is what would let the two halves drift apart.
  //
  // Every one of those theme values is read through `theme.vars`, never `theme.palette`. The theme
  // is built with `cssVariables: true`, so `theme.palette.background.paper` is the light scheme's
  // literal `#ffffff` whatever scheme is on screen, while `theme.vars.palette.background.paper` is
  // the custom property that turns over with it. A colourless card taking the resolved value paints
  // white paper in dark mode — the one state every card is in until its artwork has been sampled.
  const onGround = accent ? theme.palette.getContrastText(accent) : theme.vars.palette.text.primary;
  const line = accent ? alpha(onGround, SEAM_ALPHA) : theme.vars.palette.divider;

  return {
    ground: accent ?? theme.vars.palette.background.paper,
    onGround,
    muted: accent ? alpha(onGround, MUTED_ALPHA) : theme.vars.palette.text.secondary,
    /** Rules and hairlines drawn on the ground: a gridline, an empty track, a seam. */
    line,
    /** The edge where a surface meets the artwork it was sampled from. */
    seam: `${SEAM_WIDTH}px solid ${line}`,
    /** A tile lifted off the ground it sits on, in whichever direction reads against it. */
    tile: accent ? alpha(onGround, TILE_ALPHA) : theme.vars.palette.action.hover,
  };
};

/**
 * The accent every surface inside a card derives its palette from.
 *
 * A strip, a panel and a detail tile all sit on a ground they do not choose and cannot see — only
 * the card knows what its artwork sampled to. Handing it down as a prop instead would mean naming
 * it at each of the two dozen tiles the three domains build, and a second mechanism for the ones
 * that are not tiles.
 */
export const ArtworkAccent = createContext<Colour | undefined>(undefined);

export const useArtworkPalette = () => artworkPalette(useContext(ArtworkAccent), useTheme());
