import { Box } from "@mui/material";
import { useState } from "react";
import { CardAutoOpenContext } from "./cardAutoOpen";
import { LazyTooltip } from "./LazyTooltip";
import type { TimelineData } from "./timelineLayout";

/** A pressed mark: its key, the thunk its hover card is built by, and which press this is. */
interface OpenedMark extends Pick<TimelineData, "key" | "tooltip"> {
  /** Counted up on every press, so the same mark pressed twice mounts a fresh card. */
  press: number;
}

const OPENED_HOST_SX = {
  position: "fixed",
  // Stated in pixels: `sx` reads a bare 1 as a fraction and hands back 100%, which is a card laid
  // out and decoded at the size of the screen for as long as the layer above it stands.
  width: "1px",
  height: "1px",
  overflow: "hidden",
  opacity: 0,
  pointerEvents: "none",
} as const;

/**
 * A press that opens a mark's item, and the host its card is mounted in: `[open, host]`, the host
 * rendered once beside the marks it serves.
 *
 * A chart holds a thunk that renders the domain's hover card and knows nothing of the item inside
 * it, so the host mounts that card out of sight and asks it to open whatever layer it owns — the
 * item's expanded card, or the drill-down a card standing for a group opens instead. Every mark a
 * timeline draws opens this way — a bar, a band, a picture — so a press means one thing on every
 * layout, and the layer a picture would otherwise open is never rendered inside the hover card's
 * own anchor. The mark is held only while its layer is up.
 *
 * Fixed at a pixel rather than `display: none`, so the thumbnail still loads and samples the colour
 * the dialog is themed from; hidden from assistive technology and the pointer, since the layer it
 * opens is what is on screen. The same shape the search palette opens a hit's card through.
 */
export const useOpenedCard = () => {
  const [opened, setOpened] = useState<OpenedMark | null>(null);
  const open = ({ key, tooltip }: Pick<TimelineData, "key" | "tooltip">) =>
    setOpened((last) => ({ key, tooltip, press: (last?.press ?? 0) + 1 }));
  const host = opened && (
    <Box
      aria-hidden
      sx={OPENED_HOST_SX}
    >
      <CardAutoOpenContext.Provider value={{ auto: true, onClosed: () => setOpened(null) }}>
        {/* Keyed on the press and not the mark alone: a card whose layer has closed keeps the
            state it closed with, so a second press on the same mark would reconcile with it and
            open nothing. */}
        <LazyTooltip
          key={`${opened.press}:${opened.key}`}
          render={opened.tooltip}
        />
      </CardAutoOpenContext.Provider>
    </Box>
  );
  return [open, host] as const;
};
