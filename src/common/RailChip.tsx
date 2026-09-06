import { Chip, type Theme } from "@mui/material";
import type { ReactElement } from "react";

/**
 * What every rail's chips are, beyond being chips.
 *
 * The height and the numeric type the kit gives a small chip are stated on the theme
 * (`Google.tsx`), so a rail's marks and any chip standing in for one cannot be drawn at two sizes.
 * What is left here is that a chip never shrinks: a flex item gives up width before it overflows,
 * so without this a narrow viewport ellipsises the labels instead of letting the row scroll, which
 * is the degradation that keeps the reading order and the first chip's edge.
 */
const CHIP_SX = { flexShrink: 0 } as const;

/**
 * A chip that is only its mark, drawn as a circle.
 *
 * A chip's label padding and MUI's own icon offsets are spacing for a mark set beside a word, and
 * left in they seat the glyph 4px left of centre in a pill 9px wider than it needs to be. The
 * width follows the height through the ratio rather than a figure, so the circle is whatever the
 * theme gives a small chip on this pointer — 24px, or 32 under a finger — without this file
 * holding a second copy of either.
 */
const ICON_ONLY_SX = {
  ...CHIP_SX,
  aspectRatio: "1",
  "& .MuiChip-icon": { marginInline: 0 },
  "& .MuiChip-label": { paddingInline: 0 },
} as const;

/**
 * A chip drawn in something the app already speaks a colour for: the edge and the mark while it is
 * not the one in hand, the ground itself once it is.
 *
 * The lit form is that colour rather than the theme's primary because the row holds a chip per tab
 * and each is its own hue: lit in the primary, the current tab would be named in the colour of
 * whichever tab is open rather than in its own, and on its own page those are the same value, so
 * the chip would look right exactly where it says least.
 *
 * Built by a function rather than inline so the `getContrastText` call over the chosen colour is
 * made once against a value the caller already holds. Hover pins the same ground: MUI's own
 * `.MuiChip-clickable:hover` rule outweighs an `sx` class and would otherwise take a lit chip to
 * the primary's hover tint. Suppressing a treatment rather than adding one, so it needs no
 * `(hover: hover)` guard — there is nothing for a finger to leave behind.
 */
const chipColourSx = (colour: string, active: boolean) =>
  active
    ? {
        backgroundColor: colour,
        color: (theme: Theme) => theme.palette.getContrastText(colour),
        "& .MuiChip-icon": { color: "inherit" },
        "&.MuiChip-clickable:hover": { backgroundColor: colour },
      }
    : { color: colour, borderColor: colour };

/**
 * One rail chip, exported so a caller can put chips of its own in the `leading` slot or beside the
 * rail's own controls.
 *
 * `icon` with no `label` is a chip that is only its mark, which is how a control with no room for
 * a word joins the row. Such a chip is named by `ariaLabel` alone, and carries no hover label: a
 * word that appears only under a pointer teaches nothing to the finger the rail is mostly read
 * with, and the glyphs are taught beside their words in the app bar's own tab strip. It also keeps
 * MUI's `Tooltip`, and the Popper engine behind it, out of every chunk a rail is drawn in.
 *
 * `colour` is for a chip standing for something the app already speaks a colour for — a tab, in
 * its own. Unlit it lands on the mark and the edge rather than on the ground: a row of filled
 * chips in five hues reads as five things chosen, where the ground here means the one of them the
 * reader is on.
 */
export const RailChip = ({
  label,
  active,
  icon,
  ariaLabel,
  colour,
  railId,
  onClick,
}: {
  label?: string;
  active?: boolean;
  icon?: ReactElement;
  ariaLabel?: string;
  colour?: string;
  /**
   * What the chip stands for, published on the element so the row can find the lit one to scroll it
   * into view. An attribute rather than an `id`, which the section chips share with the `Section`
   * elements they scroll to: two nodes carrying one id leaves `getElementById` answering whichever
   * the document reaches first.
   */
  railId?: string;
  onClick: () => void;
}) => {
  const base = label === undefined ? ICON_ONLY_SX : CHIP_SX;

  return (
    <Chip
      label={label ?? ""}
      data-rail-chip={railId}
      aria-label={ariaLabel}
      icon={icon}
      size="small"
      color={active ? "primary" : "default"}
      variant={active ? "filled" : "outlined"}
      onClick={onClick}
      // An array rather than one spread object: both halves state a rule for `& .MuiChip-icon`,
      // and a spread keeps only the later key, which puts the lit chip's glyph back on MUI's
      // beside-a-word offset.
      sx={colour ? [base, chipColourSx(colour, !!active)] : base}
    />
  );
};
