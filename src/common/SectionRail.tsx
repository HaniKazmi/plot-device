import { Box } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChipRail, type ChipRailItem } from "./ChipRail";

/** A chip in the rail. The `id` matches the `Section` it scrolls to. */
export type RailSection = ChipRailItem;

/**
 * How far below the top of the viewport an anchored section comes to rest, in pixels.
 *
 * The rail is the only thing pinned above it — the AppBar is `position: static` and has scrolled
 * away by the time an anchor is used — so this is the rail's own height plus enough that the
 * section's heading is not sitting against it.
 */
export const SCROLL_MARGIN = 72;

/** Where the observer calls a section current: from just under the rail to the upper third. */
const ACTIVE_BAND = `-${SCROLL_MARGIN}px 0px -66% 0px`;

/**
 * A band a rail chip can scroll to.
 *
 * The `scrollMarginTop` is the whole reason this is a component rather than a bare `id`: without
 * it the browser lands the section's top edge at the top of the viewport, which is underneath the
 * sticky rail, and the first thing the reader was sent to see is the thing they cannot see.
 */
export const Section = ({ id, children }: { id: string; children: ReactNode }) => (
  <Box
    id={id}
    sx={{ scrollMarginTop: `${SCROLL_MARGIN}px` }}
  >
    {children}
  </Box>
);

/**
 * A band of stat cards across a section.
 *
 * Cards stretch to the tallest of the row rather than each sitting at its own height, so a row of
 * them reads as one band with a single lower edge instead of a ragged set of tiles.
 */
export const StatBand = ({ children }: { children: ReactNode }) => (
  <Grid
    container
    spacing={1}
    sx={{ alignItems: "stretch" }}
  >
    {children}
  </Grid>
);

/**
 * Two charts side by side once there is width for them, stacked below it.
 *
 * The pairing is the point wherever it appears: the two answer the same question — where the hours
 * went — through a hierarchy and through time, and reading one against the other is why a tab
 * carries both.
 */
export const ChartPair = ({ left, right }: { left: ReactNode; right: ReactNode }) => (
  <Grid
    container
    spacing={2}
  >
    <Grid size={{ xs: 12, md: 6 }}>{left}</Grid>
    <Grid size={{ xs: 12, md: 6 }}>{right}</Grid>
  </Grid>
);

/**
 * The page's own table of contents, pinned under the app bar.
 *
 * Chips scroll rather than link: the app is served under a `HashRouter`, so an `href="#timeline"`
 * would be read as a route and navigate away from the page it was meant to move within.
 */
export const SectionRail = (props: { sections: RailSection[] }) => {
  const active = useActiveSection(props.sections);

  return (
    <ChipRail
      items={props.sections}
      activeId={active}
      onSelect={(id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}
      sx={{
        position: "sticky",
        top: 0,
        // Under dialogs and the app bar, over the page it scrolls across.
        zIndex: (theme) => theme.zIndex.appBar - 1,
        // The page's own ground and not a card's: the rail sits on the page rather than in one,
        // and anything translucent would let the content scroll through it.
        backgroundColor: "background.default",
        borderBottom: 1,
        borderColor: "divider",
        paddingY: 1,
      }}
    />
  );
};

/**
 * Which section the reader is currently in, or `undefined` before the first observation.
 *
 * Keyed on the joined ids rather than on the array: a domain builds its section list inline, so
 * the array is a new value every render and depending on it would tear down and rebuild the
 * observer on each one.
 */
const useActiveSection = (sections: RailSection[]) => {
  const [active, setActive] = useState<string | undefined>(undefined);
  const ids = sections.map((section) => section.id).join(",");
  /**
   * Whether each section is in the band, for all of them rather than the ones that just changed.
   *
   * An observer callback carries only what crossed the boundary this time, so answering from the
   * entries alone is answering about a subset: scrolling up out of a section reports that one
   * leaving and says nothing about the one now filling the band, and the rail keeps a departed
   * section lit until something else happens to cross.
   */
  const intersecting = useRef(new Map<string, boolean>());

  useEffect(() => {
    const order = ids.split(",");
    // The sections are the ones this rail names now, so an id that has gone takes its answer
    // with it rather than lingering as a section that can never be observed again.
    intersecting.current = new Map();

    const elements = order.map((id) => document.getElementById(id)).filter((element) => element !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => intersecting.current.set(entry.target.id, entry.isIntersecting));
        // The rail's order is the page's order, so the first one still in the band is the
        // topmost. Nothing is in the band between two sections and while a smooth scroll is in
        // flight; holding the last answer there is what stops the rail blanking at a boundary.
        const current = order.find((id) => intersecting.current.get(id));
        if (current) setActive(current);
      },
      { rootMargin: ACTIVE_BAND },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [ids]);

  return active;
};
