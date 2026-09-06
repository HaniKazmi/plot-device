import { Chip } from "@mui/material";
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
 * its own — and lands on the mark and the edge rather than on the ground: four filled chips in
 * four hues read as four things chosen, where a filled chip in this row means the one section the
 * reader is in.
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
      sx={colour ? { ...base, color: colour, borderColor: colour } : base}
    />
  );
};
