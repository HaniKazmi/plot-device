import { Box, Chip, type SxProps, type Theme } from "@mui/material";
import type { ReactNode, Ref } from "react";
import { NUMERIC_LABEL_SX } from "./typography";

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
 * The row is the scroll container itself rather than something inside one, so a caller pinning it
 * to the top of the page — the section rail — pins the thing that scrolls sideways and does not
 * nest two scrollers.
 */
export const ChipRail = ({
  items,
  activeId,
  onSelect,
  leading,
  label,
  sx,
  ref,
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
  sx?: SxProps<Theme>;
}) => (
  <Box
    component={label ? "nav" : "div"}
    aria-label={label}
    ref={ref}
    sx={[
      {
        display: "flex",
        gap: 1,
        overflowX: "auto",
        // A scrollbar drawn under a row this short costs as much height as the row itself.
        scrollbarWidth: "none",
        "::-webkit-scrollbar": { display: "none" },
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {leading}
    {items.map((item) => (
      <RailChip
        key={item.id}
        label={item.label}
        active={item.id === activeId}
        onClick={() => onSelect(item.id)}
      />
    ))}
  </Box>
);
