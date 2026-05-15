import { Chart, Series, XAxis, YAxis, PlotOptions, Tooltip, Legend, Highcharts } from "@highcharts/react";
import { SunburstSeries } from "@highcharts/react/series/Sunburst";

Highcharts.setOptions({
  credits: {
    enabled: false,
  },
  title: {
    text: undefined,
  },
  accessibility: {
    enabled: false,
  },
});

export { Chart, Series, XAxis, YAxis, PlotOptions, Tooltip, Legend, SunburstSeries };

export const highchartsColors = Highcharts.getOptions().colors as string[];
