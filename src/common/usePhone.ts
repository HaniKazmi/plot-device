import { useMediaQuery } from "@mui/material";

/**
 * Whether the page is being read on a phone — below `sm`, the one width where a chart is not what
 * the reader came for.
 *
 * A media query rather than an `sx` breakpoint because both callers need the answer as a value:
 * a folded chart mounts nothing at all until it is opened, and the tracked tabs put their charts
 * after their library **in DOM order**, which `useActiveSection` reads the page's order from. CSS
 * can hide a chart and it can reorder a flex container, and neither of those is either of these.
 *
 * `noSsr` is what makes the first render the true answer. Left off, the first paint takes the
 * default — no match — so a phone would mount every chart and then fold it away, and the rail's
 * order would be written for the desktop and rewritten a frame later.
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
