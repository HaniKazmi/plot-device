import { alpha } from "@mui/material/styles";
import { useTheme, type Theme } from "@mui/material";
import { createContext, useContext } from "react";
import type { Colour } from "../utils/types";

const SEAM_WIDTH = 3;
/** Of the ground's own contrast colour: the secondary tone, the seam, and a tile's lift. */
const MUTED_ALPHA = 0.72;
const SEAM_ALPHA = 0.22;
const TILE_ALPHA = 0.1;

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
export const artworkPalette = (accent: Colour | undefined, theme: Theme) => {
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
