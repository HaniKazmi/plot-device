import { Box, Chip, type SxProps, type Theme } from "@mui/material";

export interface ChipRailItem {
  id: string;
  label: string;
}

/**
 * A scrolling row of chips, one of which is current.
 *
 * The row is the scroll container itself rather than something inside one, so a caller pinning it
 * to the top of the page — the section rail — pins the thing that scrolls sideways and does not
 * nest two scrollers. Chips never shrink: a flex item gives up width before it overflows, so
 * without that a narrow viewport ellipsises the labels instead of letting the row scroll, which
 * is the degradation that keeps the reading order and the first chip's edge.
 */
export const ChipRail = ({
  items,
  activeId,
  onSelect,
  label,
  sx,
  chipSx,
}: {
  items: ChipRailItem[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
  /**
   * What the rail is for, where it needs saying. A rail floating beside the content it moves
   * through has nothing around it naming it, so it becomes a landmark; one sitting under the
   * page's heading is already introduced by what it is next to.
   */
  label?: string;
  sx?: SxProps<Theme>;
  /** What this rail's chips are, beyond being chips — a fixed height, tabular figures. */
  chipSx?: SxProps<Theme>;
}) => (
  <Box
    component={label ? "nav" : "div"}
    aria-label={label}
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
    {items.map((item) => (
      <Chip
        key={item.id}
        label={item.label}
        size="small"
        color={item.id === activeId ? "primary" : "default"}
        variant={item.id === activeId ? "filled" : "outlined"}
        onClick={() => onSelect(item.id)}
        sx={[{ flexShrink: 0 }, ...(Array.isArray(chipSx) ? chipSx : [chipSx])]}
      />
    ))}
  </Box>
);
