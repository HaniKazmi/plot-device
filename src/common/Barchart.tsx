import { Card, CardContent, FormGroup, ToggleButton, ToggleButtonGroup, useTheme } from "@mui/material";
import { type ReactNode, useState } from "react";
import { BarChart, Percent, PinOutlined, SsidChart } from "@mui/icons-material";
import { SectionHeader } from "./SectionHeader";
import { Chart, Series, XAxis, YAxis, PlotOptions, Tooltip, Legend } from "../highcharts";
import type { Year, YearMonth } from "./date";
import type { Colour } from "../utils/types";
import type {} from "@mui/material/themeCssVarsAugmentation";
import { convertToCumulative, convertToRanking, convertToShare, groupDate } from "./barchartData";

/**
 * The four questions the same pivot answers: how much, of what it was made, how it accumulated,
 * and who led. One control rather than a chart-type toggle beside a cumulative switch, because
 * the combinations that pair allows are not four independent choices — a cumulative bar and a
 * ranked total are the same picture twice.
 */
type View = "Totals" | "Share" | "Cumulative" | "Rank";

const views: { view: View; icon: ReactNode }[] = [
  { view: "Rank", icon: <PinOutlined /> },
  { view: "Cumulative", icon: <SsidChart /> },
  { view: "Share", icon: <Percent /> },
  { view: "Totals", icon: <BarChart /> },
];

const seriesTypes: Record<View, "column" | "spline" | "area"> = {
  Totals: "column",
  Share: "column",
  Cumulative: "area",
  Rank: "spline",
};

const Barchart = ({
  title,
  count,
  data,
  postAggregate,
  controls,
}: {
  title: string;
  /** What the chart is over, already worded by its domain. */
  count?: string;
  data: (cumulative: boolean) => { name: string; date: YearMonth | Year; colour: Colour; value: number }[];
  /** Converts each aggregated value, e.g. minutes to hours. Empty cells stay empty. */
  postAggregate?: (value: number) => number;
  controls: ReactNode;
}) => {
  const [view, setView] = useState<View>("Totals");
  const theme = useTheme();

  const cumulative = view === "Cumulative";
  const { results: raw, dates, groups } = groupDate(data(cumulative));

  const accumulated = cumulative ? convertToCumulative(raw) : raw;
  // Share is taken over the raw measure and never through `postAggregate`, which callers are free
  // to make non-linear — a flooring minutes-to-hours conversion is what two of them pass, and the
  // share of floored values is not the share of the values behind them.
  const share = view === "Share";
  // Rank plots positions, but its tooltip still reports the underlying measure.
  const tooltipResults = share
    ? convertToShare(raw)
    : postAggregate
      ? accumulated.map((row) => row.map((value) => (value == null ? value : postAggregate(value))))
      : accumulated;
  const results = view === "Rank" ? convertToRanking(tooltipResults) : tooltipResults;

  const seriesType = seriesTypes[view];

  return (
    <Card>
      <SectionHeader
        icon={<BarChart />}
        title={title}
        count={count}
        action={
          <FormGroup>
            {controls}
            <ToggleButtonGroup
              color="primary"
              value={view}
              exclusive
              onChange={(_, val: View | null) => val && setView(val)}
            >
              {views.map(({ view: value, icon }) => (
                <ToggleButton
                  key={value}
                  value={value}
                  aria-label={value}
                  sx={{ border: 0 }}
                >
                  {icon}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
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
            reversed={view === "Rank"}
            floor={view === "Rank" ? 1 : undefined}
            max={share ? 100 : undefined}
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
          <Tooltip
            valueSuffix={share ? "%" : undefined}
            valueDecimals={share ? 1 : undefined}
          />
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
              type={seriesType}
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

export default Barchart;
