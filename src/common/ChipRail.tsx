import { Box, Chip, Tooltip, useTheme, type SxProps, type Theme } from "@mui/material";
import type { ReactElement, ReactNode, Ref } from "react";
import { ScrollFade } from "./ScrollFade";
import { useScrollEdges } from "./useScrollEdges";
import { QUIET_SIDEWAYS_SCROLL } from "./scrollbarSx";

export interface ChipRailItem {
  id: string;
  label: string;
}

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
 * a word joins the row. Such a
 * chip is named by `ariaLabel` alone, so it also carries a tooltip: the word is what a reader who
 * has not learnt the glyph needs, and a pointer is the one that can ask for it without committing
 * to the press. A finger is told nothing, its own press-and-hold belonging to the browser.
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
  onClick,
}: {
  label?: string;
  active?: boolean;
  icon?: ReactElement;
  ariaLabel?: string;
  colour?: string;
  onClick: () => void;
}) => {
  const base = label === undefined ? ICON_ONLY_SX : CHIP_SX;
  const chip = (
    <Chip
      label={label ?? ""}
      aria-label={ariaLabel}
      icon={icon}
      size="small"
      color={active ? "primary" : "default"}
      variant={active ? "filled" : "outlined"}
      onClick={onClick}
      sx={colour ? { ...base, color: colour, borderColor: colour } : base}
    />
  );

  return label === undefined && ariaLabel ? (
    <Tooltip
      title={ariaLabel}
      disableTouchListener
    >
      {chip}
    </Tooltip>
  ) : (
    chip
  );
};

/**
 * A scrolling row of chips, one of which is current.
 *
 * One scroller, and the caller's own element wraps it. A caller pinning the rail to the top of the
 * page pins the outer element and the row scrolls inside it — which is what lets the ends be faded
 * over the chips, since a scroller cannot paint above its own content. A rail that does not scroll
 * builds its own row from `RailChip`, which is what the library's jump rail does.
 */
export const ChipRail = (props: {
  items: ChipRailItem[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
  /** Rendered inside the row before the items — chips that belong to the rail but not the list. */
  leading?: ReactNode;
  ref?: Ref<HTMLDivElement>;
  /**
   * What the rail is for, where it needs saying. A rail floating beside the content it moves
   * through has nothing around it naming it, so it becomes a landmark; one sitting under the
   * page's heading is already introduced by what it is next to.
   */
  label?: string;
  /** Lands on the wrapper — what a caller pins, paints and rules off. */
  sx?: SxProps<Theme>;
  /**
   * Lands on the scrolling row. Anything laying the chips out belongs here rather than in `sx`:
   * the row is the flex container, and a flex property set on the wrapper is a property set on a
   * block box, which drops it without saying so.
   */
  rowSx?: SxProps<Theme>;
  /**
   * The colour the ends fade into, which is the surface the rail is drawn on — the page's ground
   * for a rail pinned over it, a card's paper for one sitting inside a card. A fade into the wrong
   * one is a band of a foreign colour at the end of the row rather than the row running out.
   */
  ground?: string;
}) => {
  const { items, activeId, onSelect, leading, label, sx, rowSx, ref } = props;
  // The hidden scrollbar leaves a rail wider than its row with nothing saying so, and on a phone
  // that is most of them — the chips simply stop mid-word at the edge.
  const [scrollRef, edges] = useScrollEdges<HTMLDivElement>();
  const theme = useTheme();
  const ground = props.ground ?? theme.vars.palette.background.default;

  const chips = (
    <>
      {leading}
      {items.map((item) => (
        <RailChip
          key={item.id}
          label={item.label}
          active={item.id === activeId}
          onClick={() => onSelect(item.id)}
        />
      ))}
    </>
  );

  return (
    <ScrollFade
      edges={edges}
      ground={ground}
      // `sx` lands on this element rather than on the row: what a caller pins, paints and rules off
      // is the rail, and the row inside it is only the part that moves. The fades have to sit
      // outside the scroller to be painted over what it holds, which is what makes this the outer
      // element — and the caller's ref comes here with it, since the section rail observes this
      // node to know whether it is pinned. Laying the chips out is `rowSx`, one element in.
      sx={sx}
      ref={ref}
    >
      <Box
        component={label ? "nav" : "div"}
        aria-label={label}
        ref={scrollRef}
        sx={[
          {
            display: "flex",
            gap: 1,
            overflowX: "auto",
            ...QUIET_SIDEWAYS_SCROLL,
          },
          ...(Array.isArray(rowSx) ? rowSx : [rowSx]),
        ]}
      >
        {chips}
      </Box>
    </ScrollFade>
  );
};
