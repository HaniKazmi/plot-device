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

/** What a chart is given when its height is its resolution, and what a rank lane needs. */
const CHART_HEIGHT = "80vh";
const RANK_LANE = 44;
const RANK_MIN_HEIGHT = 320;

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
  // A bump chart needs a lane per series and nothing else: three media over eight tenths of the
  // viewport puts two hundred pixels between adjacent ranks and reports, at that size, that games
  // led most years. The other three views plot a magnitude, whose resolution is the height they
  // are given, so they keep it.
  const height =
    view === "Rank" ? `min(${CHART_HEIGHT}, max(${RANK_MIN_HEIGHT}px, ${groups.length * RANK_LANE}px))` : CHART_HEIGHT;

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
          containerProps={{ style: { height } }}
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
          {/* One series, not the whole column. A shared tooltip lists every band of the stack and
              activates all of them, which is a fuller answer and a busier one: it costs the hover
              its dim, and the dim is what isolates a series across the whole chart rather than
              inside the one column under the pointer. */}
          <Tooltip
            valueSuffix={share ? "%" : undefined}
            valueDecimals={share ? 1 : undefined}
          />
          {/* Largest first, which series order is not: `groupDate` sorts ascending so that
              Highcharts' `reversedStacks` — on by default — puts the biggest group at the foot of
              the stack, where a stack is read from. The legend follows series order unless told
              otherwise, and unreversed it opens on the smallest, against every other ranked list
              on a page: the vitals band, the genre rows and the gallery's shelves all lead with
              the biggest. Reversing the legend alone leaves the stack itself untouched. */}
          <Legend
            reversed
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
