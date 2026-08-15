import {
  Card,
  CardContent,
  CardHeader,
  FormControlLabel,
  FormGroup,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from "@mui/material";
import { type ReactNode, useState } from "react";
import { BarChart, PinOutlined, SsidChart } from "@mui/icons-material";
import { Chart, Series, XAxis, YAxis, PlotOptions, Tooltip, Legend } from "../highcharts";
import type { Year, YearMonth } from "./date";
import type { Colour } from "../utils/types";
import type {} from "@mui/material/themeCssVarsAugmentation";

type GraphType = "bar" | "line" | "bump";

const getSeriesType = (graphType: GraphType, cumulative: boolean): "column" | "spline" | "area" => {
  if (graphType === "bar") return "column";
  if (graphType === "bump") return "spline";
  return cumulative ? "area" : "spline";
};

const Barchart = ({
  title,
  data,
  postAggregate,
  controls,
}: {
  title: string;
  data: (cumulative: boolean) => { name: string; date: YearMonth | Year; colour: Colour; value: number }[];
  /** Converts each aggregated value, e.g. minutes to hours. Empty cells stay empty. */
  postAggregate?: (value: number) => number;
  controls: ReactNode;
}) => {
  const [graphType, setGraphType] = useState<GraphType>("bar");
  const [cumulative, setCumulative] = useState(false);
  const theme = useTheme();

  const effectiveCumulative = cumulative && graphType !== "bar";
  const groupDateResults = groupDate(data(effectiveCumulative));
  let { results } = groupDateResults;
  const { dates, groups } = groupDateResults;

  if (effectiveCumulative) results = convertToCumulative(results);
  if (postAggregate) results = results.map((row) => row.map((value) => (value == null ? value : postAggregate(value))));
  const tooltipResults = results;
  if (graphType === "bump") results = convertToRanking(results);

  return (
    <Card>
      <CardHeader
        title={title}
        action={
          <FormGroup>
            {controls}
            <Stack direction={"row"}>
              {graphType !== "bar" && (
                <FormControlLabel
                  label="Cumulative"
                  control={
                    <Switch
                      checked={cumulative}
                      onChange={(_, checked) => setCumulative(checked)}
                    />
                  }
                />
              )}
              <ToggleButtonGroup
                color="primary"
                value={graphType}
                exclusive
                onChange={(_, val: GraphType | null) => val && setGraphType(val)}
              >
                <ToggleButton
                  value={"bump"}
                  sx={{ border: 0 }}
                >
                  <PinOutlined />
                </ToggleButton>
                <ToggleButton
                  value={"line"}
                  sx={{ border: 0 }}
                >
                  <SsidChart />
                </ToggleButton>
                <ToggleButton
                  value={"bar"}
                  sx={{ border: 0 }}
                >
                  <BarChart />
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </FormGroup>
        }
      />
      <CardContent>
        <Chart
          containerProps={{ style: { height: "80vh" } }}
          options={{
            chart: {
              backgroundColor: "transparent",
              style: {
                color: theme.vars.palette.text.primary,
              },
            },
          }}
        >
          <XAxis
            type="category"
            categories={dates.map((date) => date.toString())}
            labels={{
              style: {
                color: theme.vars.palette.text.primary,
              } as Record<string, string>,
            }}
          />
          <YAxis
            title={{
              text: undefined,
            }}
            reversed={graphType === "bump"}
            floor={graphType === "bump" ? 1 : undefined}
            minTickInterval={1}
            labels={{
              style: {
                color: theme.vars.palette.text.primary,
              } as Record<string, string>,
            }}
            endOnTick={false}
          />
          <PlotOptions
            {...({
              column: {
                stacking: "normal",
                dataLabels: {
                  enabled: false,
                },
                groupPadding: 0,
                events: {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  click: (event: any) => {
                    const {
                      series: clickedSeries,
                      series: { chart },
                    } = event.point;
                    const hasOtherVisibleSeries = chart.series.some(
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (series: any) => series !== clickedSeries && series.visible,
                    );
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    chart.series.forEach((series: any) =>
                      series.setVisible(hasOtherVisibleSeries ? series === clickedSeries : true),
                    );
                  },
                },
              },
              area: {
                stacking: "normal",
              },
              spline: {
                tooltip: {
                  pointFormat:
                    '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.tooltip}</b><br/>',
                },
              },
            } as Record<string, unknown>)}
          />
          <Tooltip />
          <Legend
            enabled={groups.length > 1}
            verticalAlign="top"
            align="left"
            itemStyle={{
              color: theme.vars.palette.text.primary,
            }}
          />
          {results.map((values, groupindex) => (
            // @ts-expect-error: TS cannot infer Series component props for union of series types
            <Series
              key={groups[groupindex].name}
              type={getSeriesType(graphType, cumulative)}
              data={values.map((val, valIndex) => ({
                y: val,
                tooltip: tooltipResults[groupindex][valIndex] ?? 0,
              }))}
              options={{
                name: groups[groupindex].name,
                color: groups.length === 1 ? theme.palette.primary.main : groups[groupindex].colour,
                lineWidth: 4,
              }}
            />
          ))}
        </Chart>
      </CardContent>
    </Card>
  );
};

const groupDate = (
  data: { name: string; date: YearMonth | Year; colour: Colour; value: number }[],
): { results: BarchartTable; dates: (YearMonth | Year)[]; groups: { name: string; colour: Colour }[] } => {
  const groupToIndex = new Map<string, { readonly index: number; readonly colour: Colour; total: number }>();
  const dateToIndex = new Map<YearMonth | Year, number>();
  let minDate: YearMonth | Year | undefined;
  let maxDate: YearMonth | Year | undefined;

  const results = data
    .filter((el) => el.date && el.value)
    .sort((a, b) => (a.date === b.date ? 0 : a.date > b.date ? 1 : -1))
    .reduce(
      (result, el) => {
        if (!minDate) {
          minDate = el.date;
          maxDate = minDate;
        }

        const groupIndex = groupToIndex.setIfAbsent(el.name, { index: groupToIndex.size, colour: el.colour, total: 0 });
        let dateIndex = dateToIndex.get(el.date);

        if (dateIndex === undefined) {
          maxDate!.iterateToDate(el.date).forEach((date) => {
            dateIndex = dateToIndex.setIfAbsent(date, dateToIndex.size);
          });
        }

        const dateToValue = (result[groupIndex.index] ||= []);
        dateToValue[dateIndex!] = (dateToValue[dateIndex!] ?? 0) + el.value;
        groupIndex.total += el.value;
        maxDate = el.date;

        return result;
      },
      [] as (number | null)[][],
    );

  const groupEntries = Array.from(groupToIndex.entries()).map(([name, { index, colour, total }]) => ({
    name,
    index,
    colour,
    total,
  }));

  groupEntries.sort((a, b) => a.total - b.total);
  const sortedResults = groupEntries.map(({ index }) => results[index] ?? []);

  sortedResults.forEach((groups) => {
    let started = false;
    for (let i = 0; i < dateToIndex.size; i++) {
      if (groups[i] != null) started = true;
      groups[i] = started ? (groups[i] ?? 0) : null;
    }
  });

  const dates = minDate && maxDate ? minDate.iterateToDate(maxDate) : [];
  const groups = groupEntries.map(({ name, colour }) => ({ name, colour }));
  return { results: sortedResults, dates, groups };
};

const convertToCumulative = (groupToDateToValue: BarchartTable) => {
  return groupToDateToValue.map((values) => {
    let sum = 0;
    let started = false;
    return values.map((val) => {
      if (val != null) {
        sum += val;
        started = true;
      }
      return started ? sum : null;
    });
  });
};

const convertToRanking = (groupToDateToValue: BarchartTable) => {
  const newArray: number[][] = groupToDateToValue.map(() => []);
  const numCols = groupToDateToValue[0]?.length ?? 0;

  for (let col = 0; col < numCols; col++) {
    groupToDateToValue
      .map((row, index) => ({ value: row[col] ?? 0, index }))
      .sort((a, b) => b.value - a.value || b.index - a.index)
      .forEach(({ index }, rank) => {
        newArray[index][col] = rank + 1;
      });
  }

  return newArray;
};

type BarchartTable = (number | null)[][];

export default Barchart;
