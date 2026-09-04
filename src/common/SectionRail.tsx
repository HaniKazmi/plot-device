import { Box, Divider } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChipRail, RailChip, type ChipRailItem } from "./ChipRail";

/** A chip in the rail. The `id` matches the `Section` it scrolls to. */
type RailSection = ChipRailItem;

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
 * Section chips scroll rather than link: the app is served under a `HashRouter`, so an
 * `href="#timeline"` would be read as a route and navigate away from the page it was meant to
 * move within. The `tabs` chips are the one exception — they exist to leave the page.
 *
 * While the rail is stuck, the app bar has scrolled away and the rail is the only navigation on
 * screen — so it leads with chips for the *other* tabs, ahead of a divider. Only the others: the
 * current tab is where the reader already is, and a third chip would rebuild the app bar rather
 * than offer the two jumps it cannot. Unstuck, the app bar is in view saying the same thing, and
 * the chips would say it twice — so they are not rendered at all. Each chip carries its own
 * `jump`, so what a tab id means stays with the registry that owns it.
 *
 * `actions` and `trailing` are page-wide controls that have to stay reachable from anywhere on the
 * page — the measure every figure below is counted in, and on a phone the filters every chart is
 * drawn through. They sit outside the scrolling row, at the end of the pinned bar, because a
 * control inside the row scrolls away with the chips and the whole point of putting them here is
 * that they do not. The row therefore gives up width to them rather than pushing them off:
 * `minWidth: 0` is what lets the chips overflow into their own scroll instead. Two slots rather
 * than one, because the filter control is the last thing on the bar wherever both are drawn.
 *
 * Below `sm` the tab chips are left out even while stuck: the bottom navigation holds all five
 * tabs at every scroll position, and a rail 358px wide would spend 300 of them saying it again.
 */
export const SectionRail = (props: {
  sections: RailSection[];
  tabs?: (RailSection & { jump: () => void })[];
  actions?: ReactNode;
  trailing?: ReactNode;
}) => {
  const active = useActiveSection(props.sections);
  const [railRef, stuck] = useStuck();

  const tabChips = stuck && props.tabs && props.tabs.length > 0 && (
    // `contents` rather than a wrapper of its own: from `sm` up the chips and the divider stay the
    // scrolling row's own flex children, exactly as they are without this.
    <Box sx={{ display: { xs: "none", sm: "contents" } }}>
      {props.tabs.map((tab) => (
        <RailChip
          key={tab.id}
          label={tab.label}
          onClick={tab.jump}
        />
      ))}
      <Divider
        orientation="vertical"
        flexItem
        sx={{ flexShrink: 0 }}
      />
    </Box>
  );

  return (
    <Box
      ref={railRef}
      sx={{
        position: "sticky",
        // A pixel above the top rather than at it, so being stuck is observable: fully visible
        // means in flow, one clipped pixel means pinned — which is also exactly when the static
        // app bar above has left the viewport.
        top: "-1px",
        // Under dialogs and the app bar, over the page it scrolls across.
        zIndex: (theme) => theme.zIndex.appBar - 1,
        // The page's own ground and not a card's: the rail sits on the page rather than in one,
        // and anything translucent would let the content scroll through it. It is also what the
        // chip row's own end fades resolve to, since they default to this same token.
        backgroundColor: "background.default",
        borderBottom: 1,
        borderColor: "divider",
        paddingY: 1,
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <ChipRail
        items={props.sections}
        activeId={active}
        leading={tabChips || undefined}
        onSelect={(id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}
        sx={{ flexGrow: 1, minWidth: 0 }}
      />
      {props.actions && <Box sx={{ flexShrink: 0 }}>{props.actions}</Box>}
      {props.trailing && <Box sx={{ flexShrink: 0, display: "flex" }}>{props.trailing}</Box>}
    </Box>
  );
};

/**
 * Whether the sticky rail is currently pinned, read off its own single clipped pixel: at
 * `top: -1px` a stuck rail's top edge sits above the viewport, and only then. Observing the rail
 * itself is what avoids a sentinel element, which as a sibling inside the page's spaced `Stack`
 * would open a gap of its own above the rail. The threshold at one is what makes the observer
 * fire on both crossings; the answer is read off the edge's sign rather than the ratio, because
 * sub-pixel layout leaves a fully visible rail fractionally short of ratio one and a comparison
 * against it pinned forever.
 */
const useStuck = () => {
  const railRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const observer = new IntersectionObserver(([entry]) => setStuck(entry.boundingClientRect.top < 0), {
      threshold: [1],
    });
    observer.observe(rail);
    return () => observer.disconnect();
  }, []);

  return [railRef, stuck] as const;
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
