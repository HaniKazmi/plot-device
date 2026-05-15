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
import { Chart, Series, XAxis, YAxis, PlotOptions, Tooltip, Legend } from "../Highcharts";
import type { Year, YearMonth } from "./date";
import type { Colour } from "../utils/types";
import type {} from "@mui/material/themeCssVarsAugmentation";

type GraphType = "bar" | "line" | "bump";
const Barchart = ({
  title,
  data,
  dataPostProcess,
  controls,
}: {
  title: string;
  data: (cumulative: boolean) => { name: string; date: YearMonth | Year; colour: Colour; value: number }[];
  dataPostProcess?: (table: BarchartTable) => BarchartTable;
  controls: ReactNode;
}) => {
  const [graphType, setGraphType] = useState<GraphType>("bar");
  const [cumulative, setCumulative] = useState(false);
  const theme = useTheme();

  const effectiveCumulative = cumulative && graphType !== "bar";
  const groupDateResults = groupDate(data(effectiveCumulative));
  let { results } = groupDateResults;
  const { dates, groups } = groupDateResults;

  if (effectiveCumulative) results = convertToCumulative(results, dates);
  if (dataPostProcess) results = dataPostProcess(results);
  const tooltipResults = results;
  if (graphType == "bump") results = convertToRanking(results, dates);

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
                onChange={(_, val: GraphType) => val.length && setGraphType(val)}
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
              } as any,
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
              } as any,
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
              line: {},
              area: {
                stacking: "normal",
              },
              spline: {
                tooltip: {
                  pointFormat:
                    '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.tooltip}</b><br/>',
                },
              },
            } as any)}
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
            <Series
              key={groups[groupindex].name}
              type={
                (graphType == "bar" ? "column" : graphType == "bump" ? "spline" : cumulative ? "area" : "spline") as any
              }
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
  let minDate = null as YearMonth | Year | null;
  let maxDate = null as YearMonth | Year | null;

  const results = data
    .filter((el) => el.date && el.value)
    .sort(({ date: dateA }, { date: dateB }) => {
      if (dateA === dateB) return 0;
      return dateA > dateB ? 1 : -1;
    })
    .reduce(
      (result, el) => {
        if (!el.date || !el.value) return result;
        if (!minDate) {
          minDate = el.date;
          maxDate = minDate;
        }

        const groupIndex = groupToIndex.setIfAbsent(el.name, { index: groupToIndex.size, colour: el.colour, total: 0 });
        let dateIndex = dateToIndex.get(el.date);
        if (!dateIndex) {
          maxDate!.iterateToDate(el.date).forEach((date) => {
            dateIndex = dateToIndex.setIfAbsent(date, dateToIndex.size);
          });
        }

        const dateToValue = (result[groupIndex.index] ||= []);
        dateToValue[dateIndex!] ||= 0;
        dateToValue[dateIndex!]! += el.value;
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
  const sortedResults = groupEntries.map(({ index }) => results[index]);
  sortedResults.forEach((groups) => {
    const minIndex = groups.findIndex((g) => g);
    for (let i = 0; i < minIndex; i++) {
      groups[i] ||= null;
    }

    for (let i = minIndex; i < groups.length; i++) {
      groups[i] ||= 0;
    }
  });

  const dates = minDate && maxDate ? minDate.iterateToDate(maxDate) : [];
  const groups = groupEntries.map(({ name, colour }) => ({ name, colour }));
  return { results: sortedResults, dates, groups };
};

const convertToCumulative = (groupToDateToValue: BarchartTable, dates: (YearMonth | Year)[]) => {
  return groupToDateToValue.reduce((newGroupToDateToValue, values) => {
    newGroupToDateToValue.push(
      dates.reduce(
        (arr, _, index) => {
          arr[index] =
            (values[index] ?? false) || (arr[index - 1] ?? false) ? (arr[index - 1] ?? 0) + (values[index] ?? 0) : null;
          return arr;
        },
        [] as (number | null)[],
      ),
    );

    return newGroupToDateToValue;
  }, [] as BarchartTable);
};

const convertToRanking = (groupToDateToValue: BarchartTable, dates: (YearMonth | Year)[]) => {
  const newArray: number[][] = [];
  dates.forEach((_, col) => {
    const columnValues = groupToDateToValue
      .map((row, index) => ({ value: row[col] ?? 0, index }))
      .sort((a, b) => {
        if (a.value === b.value) {
          return b.index - a.index;
        }
        return b.value - a.value;
      });

    columnValues.forEach(({ index }, rank) => {
      newArray[index] ||= [];
      newArray[index][col] = rank + 1;
    });
  });

  return newArray;
};

export type BarchartTable = (number | null)[][];

export default Barchart;
