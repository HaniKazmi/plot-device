import { useMediaQuery } from "@mui/material";

/**
 * The two widths the app reads as values rather than writing as `sx` breakpoint keys, and nothing
 * else: everywhere a breakpoint only picks a style, the style carries it.
 */

/**
 * Whether the page is being read on a phone — below `sm`, the one width where a chart is not what
 * the reader came for.
 *
 * A media query rather than an `sx` breakpoint because the callers need the answer as a value: a
 * folded chart mounts nothing at all until it is opened, a sheet and a drawer are different trees
 * rather than one tree at two sizes, and the tracked tabs put their charts after their library **in
 * DOM order**, which `useActiveSection` reads the page's order from. CSS can hide a chart and it can
 * reorder a flex container, and neither of those is any of these.
 *
 * `noSsr` states the query's real answer as the server snapshot too. `main.tsx` mounts with
 * `createRoot` and never hydrates, so that snapshot is not read and the first render already
 * matches the screen; the option is what keeps that true of a root that did hydrate, one hook
 * giving one answer rather than two under different roots.
 */
export const usePhone = () => useMediaQuery((theme) => theme.breakpoints.down("sm"), { noSsr: true });

/**
 * Whether a chart has the page to itself — below `md`, where `ChartPair` stacks rather than
 * standing its two charts side by side.
 *
 * The height a chart is drawn at follows from that, and it is read as a value rather than written
 * as an `sx` breakpoint because Highcharts sizes itself off its container's own height at the
 * moment it initialises: a percentage height on that container measures as the library's own 400px
 * default, and the chart is then drawn past the box holding it.
 */
export const useStackedCharts = () => useMediaQuery((theme) => theme.breakpoints.down("md"), { noSsr: true });
