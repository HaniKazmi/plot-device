import { Chart, Series, XAxis, YAxis, PlotOptions, Tooltip, Legend, Highcharts } from "@highcharts/react";
import { SunburstSeries } from "@highcharts/react/series/Sunburst";

Highcharts.setOptions({
  // Set here rather than on the theme, because `setOptions` runs once and both colour schemes get
  // this same ramp. Every entry sits at one luminance, inside the band where a fill clears 3:1
  // against a #ffffff card and a #1d2126 card alike — about 0.15 to 0.30. Hue is therefore the
  // only thing separating two series: moving lightness far enough to read on one ground buries
  // the colour against the other.
  colors: ["#3985d1", "#d55b4e", "#2b944e", "#c06d24", "#9a6dcc", "#24908c", "#9f7d1a", "#658697"],
  credits: {
    enabled: false,
  },
  title: {
    text: undefined,
  },
  accessibility: {
    enabled: false,
  },
  tooltip: {
    // Left on, a finger dragged across a chart moves the tooltip from point to point and the
    // page does not scroll at all — an 80vh chart then holds the reader on it until they find a
    // gap to start the drag in. Off, a tap still shows the point, and column tap-to-isolate and
    // the sunburst's tap-to-drill are untouched.
    followTouchMove: false,
  },
});

export { Chart, Series, XAxis, YAxis, PlotOptions, Tooltip, Legend, SunburstSeries };

export const highchartsColors = Highcharts.getOptions().colors as string[];
