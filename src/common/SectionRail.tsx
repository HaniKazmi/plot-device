import { Box, Divider } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import Grid from "@mui/material/Grid";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePhone } from "./breakpoints";
import { ChipRail, RailChip, type ChipRailItem } from "./ChipRail";
import { BROWSER_TINT_VISIBLE } from "./chrome";
import { usePhoneBarSlot } from "./phoneBar";
import { QUIET_SIDEWAYS_SCROLL } from "./scrollbarSx";

/** A chip in the rail. The `id` matches the `Section` it scrolls to. */
export type RailSection = ChipRailItem;

/**
 * How far off centre a pinned rail's chips sit before its padding answers for it, in pixels: the
 * tint strip covering the top edge, the one pixel the sticky offset clips above, and the one pixel
 * of rule below.
 */
const PINNED_BIAS = BROWSER_TINT_VISIBLE + 2;

/**
 * How far below the top of the viewport an anchored section comes to rest from `sm` up, in pixels.
 *
 * The rail is the only thing pinned above it — the AppBar is `position: static` and has scrolled
 * away by the time an anchor is used — so this is the rail's own height plus enough that the
 * section's heading is not sitting against it. The rail is its padding either side of the tallest
 * thing in it plus the rule beneath: 8 + 28 + 8 + 1 with a pointer, and 8 + 32 + 8 + 1 under a
 * finger, the two heights the kit gives a control (`common/typography.ts`). This clears the taller
 * of them by 23px.
 */
export const SCROLL_MARGIN = 72;

/**
 * The same figure below `sm`, where the rail is drawn in the bar at the bottom of the screen
 * (`BottomTabs.tsx`) and nothing at all is pinned at the top: a section lands against the viewport's
 * own edge, so all this buys is that its heading is not touching it.
 */
export const PHONE_SCROLL_MARGIN = 8;

/**
 * What a phone's anchored section clears, as CSS rather than a number.
 *
 * `viewport-fit=cover` lays the page out to the physical top of the screen, so on a device with a
 * notch — a home-screen install, where the browser draws no chrome of its own above the page — the
 * inset is what stands between a landed heading and the sensor housing. The observer's own band
 * takes the plain figure: a few tens of pixels either way decide nothing about which section a
 * reader is in, and `env()` cannot be read from a `rootMargin` at all.
 */
const PHONE_SCROLL_MARGIN_CSS = `calc(${PHONE_SCROLL_MARGIN}px + env(safe-area-inset-top))`;

/** Where the observer calls a section current: from just under whatever is pinned to the upper third. */
const activeBand = (top: number) => `-${top}px 0px -66% 0px`;

/**
 * A band a rail chip can scroll to.
 *
 * The `scrollMarginTop` is the whole reason this is a component rather than a bare `id`: without
 * it the browser lands the section's top edge at the top of the viewport, which is underneath the
 * sticky rail, and the first thing the reader was sent to see is the thing they cannot see. Below
 * `sm` there is nothing pinned up there to clear, and the margin is the device's own inset instead.
 */
export const Section = ({ id, children }: { id: string; children: ReactNode }) => (
  <Box
    id={id}
    sx={{ scrollMarginTop: { xs: PHONE_SCROLL_MARGIN_CSS, sm: `${SCROLL_MARGIN}px` } }}
  >
    {children}
  </Box>
);

/** A band of stat cards across a section. */
export const StatBand = ({ children }: { children: ReactNode }) => (
  // Cards stretch to the tallest of the row rather than each sitting at its own height, so a row of
  // them reads as one band with a single lower edge instead of a ragged set of tiles — a flex
  // container's own default, so the band states nothing.
  <Grid
    container
    spacing={1}
  >
    {children}
  </Grid>
);

/**
 * What each half of the pair takes, stated by the thing that makes them a pair.
 *
 * A sunburst is a circle whose diameter is its column's width, so it caps where a barchart would
 * go on climbing: left to state their own heights the two end at `min(80vh, 700px)` and a bare
 * `80vh`, which is 23px apart on a 1440x900 window and 263 on a 1200px-tall one, the shorter card
 * ending inside a row the taller has already stretched.
 *
 * A custom property rather than a prop or a context: each chart falls back to its own full-width
 * height where nothing sets one, so the Omnibus's own barchart is untouched without either shell
 * having to ask whether it is in a pair.
 *
 * The cells fill the row too. The two carry the same chart box but not the same header — the
 * sunburst's nesting controls take a second row at the one width where three rings and a title do
 * not share a line — so a card left at its content's height stops short by that difference.
 */
const PAIR_CELL_SX = {
  "--paired-chart-height": "min(80vh, 700px)",
  display: "flex",
  "& > *": { flexGrow: 1, minWidth: 0 },
} as const;

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
    <Grid
      size={{ xs: 12, md: 6 }}
      sx={PAIR_CELL_SX}
    >
      {left}
    </Grid>
    <Grid
      size={{ xs: 12, md: 6 }}
      sx={PAIR_CELL_SX}
    >
      {right}
    </Grid>
  </Grid>
);

/**
 * The rail's tail: the page-wide controls, laid out in a row that scrolls before it overflows.
 *
 * The scrollbar is hidden for the chip row's own reason — one drawn under a row this short costs
 * as much height as the row — and the flick is contained, or a drag reaching either end carries on
 * into the browser's back gesture.
 */
const ACTIONS_SX = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  minWidth: 0,
  // The controls keep their own width and the row scrolls past them: left to shrink, a picker
  // wraps its value onto a second line and a segment loses its last word, which is a control
  // drawn wrong rather than one waiting off the end of a row.
  "& > *": { flexShrink: 0 },
  overflowX: "auto",
  ...QUIET_SIDEWAYS_SCROLL,
} as const;

/** The rail's last cell, which never gives up a pixel: the population chip, or the phone's own. */
const TRAILING_SX = { flexShrink: 0, display: "flex" } as const;

/**
 * Where the year scope is drawn, which is the one part of the tail a tablet has no room for: at
 * 768 a rail holding four tab chips, seven section chips, a picker, three segments and the
 * population wants about 950px of 720. Below `md` the scope is a labelled row in the box's This
 * page mode instead, so the rail keeps the two readings a page is most often changed by.
 *
 * A `display` rule rather than the width the rail reads as a value, since the control is drawn in
 * the filter surface at every width below `md` — one of the two is hidden either way, and hiding
 * the rail's copy costs a mounted picker where hiding the sheet's would cost the same.
 */
const SCOPE_SX = { display: { xs: "none", md: "flex" } } as const;

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
 * `scope`, `measure` and `population` are the page-wide controls, the readings that have to stay
 * reachable from anywhere on the page — the years every figure below is scoped to, the unit they
 * are counted in, and the filters every chart is drawn through. They sit outside the scrolling row,
 * at the end of the pinned bar, because a control inside the row scrolls away with the chips and
 * the whole point of putting them here is that they do not. The row gives up width to them rather
 * than pushing them off: `minWidth: 0` is what lets the chips overflow into their own scroll
 * instead. Three named slots rather than one node, because where each stands is a rule this shell
 * states once — the population is the last thing on the bar, the scope is drawn from `md` and
 * stands in the box's This page mode below it — where five pages handing over opaque nodes would
 * each carry a copy of that rule.
 *
 * On a phone the three give the row up entirely and `pageChip` stands in their place: at 390px
 * they want 440px of 358, and the chips are what the rail exists for and the only part of it that
 * can degrade by scrolling. The chip states the measure — the setting changed most often — and
 * opens the sheet holding all three.
 *
 * Below `sm` the whole row is drawn inside the bar at the bottom of the screen instead
 * (`BottomTabs.tsx`, through `phoneBar.ts`): one bar rather than a pinned rail above the page and
 * the tabs below it, which is 49px of a 720px screen given back to what the page is for. The tab
 * chips are left out there — the bar's own leading chip calls the five tabs back into it, and a rail
 * 358px wide would spend 300 of them saying that again.
 * From `sm` up each is its tab's own icon in its own colour rather than its name: four words and a
 * divider take a third of a tablet's rail, where four glyphs take 136px of it, and the app bar's
 * own strip carries the same icons beside its words, which is where the glyphs are learnt.
 */
export const SectionRail = (props: {
  sections: RailSection[];
  tabs?: (RailSection & { icon: SvgIconComponent; colour?: string; jump: () => void })[];
  scope?: ReactNode;
  measure?: ReactNode;
  population?: ReactNode;
  pageChip?: ReactNode;
  /**
   * The phone row's leading chip: the current tab, calling the five back into the bar this row is
   * drawn in. It comes from the caller because only the registry knows what a tab is, and it is
   * drawn here rather than by the bar itself so that the bar carries none of the chip's own
   * machinery — a tooltip, and with it MUI's popper — into the chunk evaluated before the first
   * paint.
   */
  tabChip?: ReactNode;
  /**
   * The ground the phone's bar draws this row on, which the chip row's end fades have to resolve
   * to: left to their default they fade into the page's own ground, a pale band over a bar that is
   * the tab's colour.
   */
  phoneGround?: string;
}) => {
  // Which tail the rail draws, and where the rail is drawn at all. A value rather than a `display`
  // rule, because the controls it hides are mounted in the box's This page mode at this width
  // instead: drawn here and hidden, each would be a second live copy dispatching to the same page
  // state from a control nobody can see — and because below `sm` this is not a pinned bar of its
  // own but a row inside the one at the bottom of the screen, which no CSS can say.
  const phone = usePhone();
  const active = useActiveSection(props.sections, phone ? PHONE_SCROLL_MARGIN : SCROLL_MARGIN);
  const [railRef, stuck] = useStuck(!phone);
  const slot = usePhoneBarSlot();

  const tabChips = stuck && props.tabs && props.tabs.length > 0 && (
    // `contents` rather than a wrapper of its own: from `sm` up the chips and the divider stay the
    // scrolling row's own flex children, exactly as they are without this.
    <Box sx={{ display: { xs: "none", sm: "contents" } }}>
      {props.tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <RailChip
            key={tab.id}
            icon={<Icon />}
            ariaLabel={tab.label}
            colour={tab.colour}
            onClick={tab.jump}
          />
        );
      })}
      <Divider
        orientation="vertical"
        flexItem
        sx={{ flexShrink: 0 }}
      />
    </Box>
  );

  const chipRow = (
    <ChipRail
      items={props.sections}
      ground={phone ? props.phoneGround : undefined}
      activeId={active}
      leading={tabChips || undefined}
      onSelect={(id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}
      // Whatever the tail leaves, and never a share of the shortfall: at a basis of zero the row
      // grows into the free space and has none of its own to give up, so a phone's rail spends
      // its width on the controls first and the chips take what is left. Sized from its content
      // instead, the two shrink in proportion and the controls are the half that cannot degrade
      // — a picker at three quarters of its width is a value with no room for its own caret,
      // where a chip row is a list that scrolls by design.
      sx={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
    />
  );

  const tail = phone ? (
    props.pageChip && <Box sx={TRAILING_SX}>{props.pageChip}</Box>
  ) : (
    <>
      {(props.scope || props.measure) && (
        // A row of its own, the slot holding more than one control: the scope and the measure
        // are two page-wide readings side by side, and a block would stack them and stand the
        // rail at twice its height.
        //
        // It scrolls rather than pushing the page wider. A rail that overflows its own
        // container puts the whole document on a sideways scroll — every drag on the page
        // drifts it off centre. Shrinking here instead keeps the tail's own controls a flick
        // apart at the end of the bar where they are pinned, and costs nothing at a width that
        // fits them.
        <Box sx={ACTIONS_SX}>
          {props.scope && <Box sx={SCOPE_SX}>{props.scope}</Box>}
          {props.measure}
        </Box>
      )}
      {props.population && <Box sx={TRAILING_SX}>{props.population}</Box>}
    </>
  );

  // Below `sm` the row is the bottom bar's scrolled state rather than a bar of its own: the page
  // gives back the 49px a second pinned strip would cost it, on the one screen where height is
  // scarcest. It renders nothing until the bar has published its slot, and nothing at all where
  // there is no bar — a rail drawn at the top as well would be the arrangement stated twice.
  if (phone)
    return (
      slot &&
      createPortal(
        <>
          {props.tabChip}
          {chipRow}
          {tail}
        </>,
        slot,
      )
    );

  return (
    <Box
      ref={railRef}
      sx={(theme) => ({
        position: "sticky",
        // A pixel above the top rather than at it, so being stuck is observable: fully visible
        // means in flow, one clipped pixel means pinned — which is also exactly when the static
        // app bar above has left the viewport.
        top: "-1px",
        // Under dialogs and the app bar, over the page it scrolls across.
        zIndex: theme.zIndex.appBar - 1,
        // The page's own ground and not a card's: the rail sits on the page rather than in one,
        // and anything translucent would let the content scroll through it. It is also what the
        // chip row's own end fades resolve to, since they default to this same token.
        backgroundColor: "background.default",
        borderBottom: 1,
        borderColor: "divider",
        paddingY: 1,
        // Pinned, three things push the chips off centre, all the same way: the strip Safari
        // samples to colour the status bar stands in front of the rail's top `BROWSER_TINT_VISIBLE`
        // pixels (`chrome.ts`), the sticky offset above clips one more, and the rule along the
        // bottom edge adds one under. Half of that bias moved from the bottom padding to the top
        // puts the chips back in the middle of what is actually on screen.
        //
        // Moved rather than added, so the rail stands the same height pinned or not and nothing
        // below it shifts as it pins; solved from the constant rather than stated, so raising the
        // sliver cannot leave the rail balanced for the old one. Asked for under a coarse pointer
        // alone, which is where the strip is drawn at all.
        ...(stuck && {
          "@media (pointer: coarse)": {
            paddingTop: `calc(${theme.spacing(1)} + ${PINNED_BIAS / 2}px)`,
            paddingBottom: `calc(${theme.spacing(1)} - ${PINNED_BIAS / 2}px)`,
          },
        }),
        display: "flex",
        alignItems: "center",
        gap: 1,
      })}
    >
      {chipRow}
      {tail}
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
const useStuck = (enabled: boolean) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  // Keyed on whether there is a pinned rail at all: below `sm` the row is drawn in the bottom bar
  // and this ref holds nothing, so a phone turned sideways past that width mounts the rail with an
  // effect that has already run and would never observe it.
  useEffect(() => {
    const rail = railRef.current;
    if (!enabled || !rail) return;
    const observer = new IntersectionObserver(([entry]) => setStuck(entry.boundingClientRect.top < 0), {
      threshold: [1],
    });
    observer.observe(rail);
    return () => observer.disconnect();
  }, [enabled]);

  return [railRef, stuck] as const;
};

/**
 * Which section the reader is currently in, or `undefined` before the first observation.
 *
 * Keyed on the joined ids rather than on the array: a domain builds its section list inline, so
 * the array is a new value every render and depending on it would tear down and rebuild the
 * observer on each one.
 */
const useActiveSection = (sections: RailSection[], topMargin: number) => {
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
      { rootMargin: activeBand(topMargin) },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [ids, topMargin]);

  return active;
};
