import "highcharts/es-modules/Series/Line/LineSeries";
import "highcharts/es-modules/Series/Column/ColumnSeries";
import "highcharts/es-modules/Series/Pie/PieSeries";
import "highcharts/es-modules/Series/Scatter/ScatterSeries";
import Highcharts from "highcharts/es-modules/masters/highcharts.src.js";
import "highcharts/es-modules/masters/modules/sunburst.src.js";
import HighchartsReact, { HighchartsReactProps } from "highcharts-react-official";

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

export const HighchartsWrapper = (props: HighchartsReact.Props) => {
  // Handle Vite's ESM/CJS interop by unwrapping the default export if necessary
  const Component = (HighchartsReact as any).default ?? HighchartsReact;

  return (
    <Component
      highcharts={Highcharts}
      {...props}
    />
  );
};

export type Series = Highcharts.Series;
export type Options = HighchartsReactProps["options"];
