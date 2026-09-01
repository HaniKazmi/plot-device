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
 * A row of chips, one of which is current — or a column of them, for a rail that runs down a
 * gutter rather than across the top of a page.
 *
 * The two are one component because they are one control: the same chips, the same current one,
 * the same jump. They differ in what a caller's `sx` has to reach, which is why `vertical` exists
 * rather than being read off a `flexDirection` the caller happened to pass.
 *
 * A row scrolls, so it is wrapped: the caller's element is the outer one and the chips scroll
 * inside it, which is what lets the ends be faded over them — a scroller cannot paint above its own
 * content. A column does not scroll at all, because a jump rail is only mounted where every chip
 * fits at full height, so it is one element and the caller's `sx` lays it out directly. Wrapping it
 * anyway would send the caller's own `flexDirection` and `justify-content` to a box that holds no
 * chips.
 */
export const ChipRail = ({
  items,
  activeId,
  onSelect,
  leading,
  label,
  sx,
  ref,
  vertical,
}: {
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
  /** A column down a gutter rather than a row across a page: laid out by the caller, never scrolled. */
  vertical?: boolean;
  sx?: SxProps<Theme>;
}) => {
  // The hidden scrollbar leaves a rail wider than its row with nothing saying so, and on a phone
  // that is most of them — the chips simply stop mid-word at the edge.
  const [scrollRef, edges, onScroll] = useScrollEdges<HTMLDivElement>();
  const theme = useTheme();

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

  if (vertical) {
    return (
      <Box
        component={label ? "nav" : "div"}
        aria-label={label}
        ref={ref}
        sx={[{ display: "flex" }, ...(Array.isArray(sx) ? sx : [sx])]}
      >
        {chips}
      </Box>
    );
  }

  return (
    <ScrollFade
      edges={edges}
      // The page's own ground, since the rail is pinned over the content rather than sitting in a
      // card of its own.
      ground={theme.vars.palette.background.default}
      // The caller's own styling lands on this element rather than on the row: what a caller pins,
      // paints and rules off is the rail, and the row inside it is only the part that moves. The
      // fades have to sit outside the scroller to be painted over what it holds, which is what
      // makes this the outer element — and the caller's ref comes here with it, since the section
      // rail observes this node to know whether it is pinned.
      sx={sx}
      ref={ref}
    >
      <Box
        component={label ? "nav" : "div"}
        aria-label={label}
        ref={scrollRef}
        onScroll={onScroll}
        sx={{
          display: "flex",
          gap: 1,
          overflowX: "auto",
          // A scrollbar drawn under a row this short costs as much height as the row itself.
          scrollbarWidth: "none",
          "::-webkit-scrollbar": { display: "none" },
        }}
      >
        {chips}
      </Box>
    </ScrollFade>
  );
};
