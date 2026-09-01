import { Box, Chip, useTheme, type SxProps, type Theme } from "@mui/material";
import type { ReactNode, Ref } from "react";
import { NUMERIC_LABEL_SX } from "./typography";
import { ScrollFade } from "./ScrollFade";
import { useScrollEdges } from "./useScrollEdges";

export interface ChipRailItem {
  id: string;
  label: string;
}

/**
 * The height of a rail chip, and so of any label standing in for one — the pill the scroll marker
 * falls back to speaks the same vocabulary and has to be the same size to read as the same thing.
 */
export const CHIP_HEIGHT = 22;

/**
 * What every rail's chips are, beyond being chips.
 *
 * A fixed height rather than the size's own, because a rail spread down a gutter or across a chart
 * is a scale, and a scale's marks are one size. The type is the numeric label treatment, since most
 * of these labels are years. Chips never shrink either — a flex item gives
 * up width before it overflows, so without that a narrow viewport ellipsises the labels instead of
 * letting the row scroll, which is the degradation that keeps the reading order and the first
 * chip's edge.
 */
const CHIP_SX = {
  flexShrink: 0,
  height: CHIP_HEIGHT,
  ...NUMERIC_LABEL_SX,
} as const;

/** One rail chip, exported so a caller can put chips of its own in the `leading` slot. */
export const RailChip = ({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) => (
  <Chip
    label={label}
    size="small"
    color={active ? "primary" : "default"}
    variant={active ? "filled" : "outlined"}
    onClick={onClick}
    sx={CHIP_SX}
  />
);

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
            // A scrollbar drawn under a row this short costs as much height as the row itself.
            scrollbarWidth: "none",
            "::-webkit-scrollbar": { display: "none" },
          },
          ...(Array.isArray(rowSx) ? rowSx : [rowSx]),
        ]}
      >
        {chips}
      </Box>
    </ScrollFade>
  );
};
