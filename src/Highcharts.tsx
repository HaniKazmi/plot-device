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
  return <HighchartsReact highcharts={Highcharts} {...props} />;
};

export type Series = Highcharts.Series;
export type Options = HighchartsReactProps["options"];
