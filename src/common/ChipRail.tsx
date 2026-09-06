import { Box, useTheme, type SxProps, type Theme } from "@mui/material";
import { useEffect, type ReactNode, type Ref } from "react";
import { railScrollTarget } from "./chipRailData";
import { RailChip } from "./RailChip";
import { ScrollFade } from "./ScrollFade";
import { useScrollEdges } from "./useScrollEdges";
import { QUIET_SIDEWAYS_SCROLL } from "./scrollbarSx";

export interface ChipRailItem {
  id: string;
  label: string;
}

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
  /**
   * Whether the row scrolls itself to keep the lit chip in view.
   *
   * A rail whose chips are a reading of where in the page the reader is asks for it: the lit chip
   * moves as the page is read, and one scrolled off the end says nothing. A rail whose chips are a
   * scale under a chart does not — the years are spread `space-between` across the chart's own
   * width, the lit one changes as the chart is dragged sideways, and following it would take the
   * row out from under the finger that is moving the chart.
   */
  follow?: boolean;
}) => {
  const { items, activeId, onSelect, leading, label, sx, rowSx, ref, follow } = props;
  // The hidden scrollbar leaves a rail wider than its row with nothing saying so, and on a phone
  // that is most of them — the chips simply stop mid-word at the edge.
  const [scrollRef, edges] = useScrollEdges<HTMLDivElement>();
  const theme = useTheme();
  const ground = props.ground ?? theme.vars.palette.background.default;

  /**
   * The row follows the highlight where the caller asks for it: a rail that is a reading of where
   * in the page the reader is says nothing with its lit chip scrolled off the end — on a phone the
   * row holds four of a tab's seven sections, so most of the page's positions are off-screen
   * positions.
   *
   * Keyed on the lit chip alone, so the reader's own flick along the row is never taken back: the
   * effect runs when the answer changes and not when the row moves. The offset is computed rather
   * than asked for through `scrollIntoView`, which scrolls every scrollable ancestor — including the
   * document, which would move the page the highlight is a reading of.
   *
   * Measured from the two rects rather than `offsetLeft`, whose origin is the nearest positioned
   * ancestor and not necessarily this row.
   */
  useEffect(() => {
    const row = scrollRef.current;
    if (!follow || !row || activeId === undefined) return;
    const chip = row.querySelector<HTMLElement>(`[data-rail-chip="${CSS.escape(activeId)}"]`);
    if (!chip) return;
    const rowBox = row.getBoundingClientRect();
    const chipBox = chip.getBoundingClientRect();
    const target = railScrollTarget(
      row.scrollLeft,
      row.clientWidth,
      chipBox.left - rowBox.left + row.scrollLeft,
      chipBox.width,
    );
    // A sub-pixel correction is a scroll nobody asked for: `scrollLeft` is fractional under a
    // device pixel ratio that is not a whole number, so an exact comparison moves the row on every
    // change of highlight, smoothly, by nothing.
    if (Math.abs(target - row.scrollLeft) < 1) return;
    row.scrollTo({
      left: target,
      // A reader who has asked for less motion gets the row in its new position rather than a
      // journey to it. Read here rather than subscribed to: the answer is wanted at the moment of
      // the scroll, and a change to it re-renders nothing.
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [activeId, follow, scrollRef]);

  const chips = (
    <>
      {leading}
      {items.map((item) => (
        <RailChip
          key={item.id}
          label={item.label}
          railId={item.id}
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
