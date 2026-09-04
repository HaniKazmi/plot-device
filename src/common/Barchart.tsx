import { Card, CardContent, FormGroup, Typography, useTheme } from "@mui/material";
import { type ReactNode, useState } from "react";
import { BarChart } from "@mui/icons-material";
import { SectionHeader } from "./SectionHeader";
import { SegmentedControl } from "./SelectionComponents";
import { segments } from "./segments";
import { FoldedChart, Sparkline } from "./FoldedChart";
import { useStackedCharts } from "./breakpoints";
import { Chart, Series, XAxis, YAxis, PlotOptions, Tooltip, Legend } from "../highcharts";
import type { Year, YearMonth } from "./date";
import type { Colour } from "../utils/types";
import { format } from "../utils/mathUtils";
import type {} from "@mui/material/themeCssVarsAugmentation";
import {
  barchartSummary,
  columnTotals,
  convertToCumulative,
  convertToRanking,
  convertToShare,
  groupDate,
  type BarchartSummary,
} from "./barchartData";

/**
 * The four questions the same pivot answers: how much, of what it was made, how it accumulated,
 * and who led. One control rather than a chart-type toggle beside a cumulative switch, because
 * the combinations that pair allows are not four independent choices — a cumulative bar and a
 * ranked total are the same picture twice.
 */
type View = "Totals" | "Share" | "Cumulative" | "Rank";

/** The default leads, so the segment lit on arrival is the one the reader's eye starts at. */
const viewOptions = segments<View>(["Totals", "Share", "Cumulative", "Rank"]);

/**
 * What a chart is given when its height is its resolution, and what a rank lane needs.
 *
 * Four fifths of a desktop viewport is a chart to read a magnitude off. On a phone that same
 * fraction is a chart the reader has to scroll through to see the top of, on a page where the
 * chart was opened deliberately and something else is meant to follow it, so it takes three
 * fifths instead — still the tallest thing in the card, and one thumb-flick tall rather than two.
 */
const CHART_HEIGHT = { stacked: "60vh", beside: "80vh" } as const;
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
  unit,
  controls,
}: {
  title: string;
  /** What the chart is over, already worded by its domain. */
  count?: string;
  data: (cumulative: boolean) => { name: string; date: YearMonth | Year; colour: Colour; value: number }[];
  /** Converts each aggregated value, e.g. minutes to hours. Empty cells stay empty. */
  postAggregate?: (value: number) => number;
  /** What one unit of the measure is called, for the line a folded chart states instead of itself. */
  unit: string;
  controls: ReactNode;
}) => {
  const [view, setView] = useState<View>("Totals");
  const theme = useTheme();
  const full = useStackedCharts() ? CHART_HEIGHT.stacked : CHART_HEIGHT.beside;

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
  const height = view === "Rank" ? `min(${full}, max(${RANK_MIN_HEIGHT}px, ${groups.length * RANK_LANE}px))` : full;

  const header = (
    <SectionHeader
      icon={<BarChart />}
      title={title}
      count={count}
      action={
        <FormGroup>
          {controls}
          <SegmentedControl
            options={viewOptions}
            value={view}
            onChange={setView}
            ariaLabel="View"
          />
        </FormGroup>
      }
    />
  );

  // An empty pivot is not drawn as nothing: Highcharts invents an index axis and a series of its
  // own from it, so a chart with no data reads as a chart of unnamed data. A caller's own section
  // gate cannot answer this, because a grouping the caller offers can empty the pivot after the
  // gate has decided there is something to say — which is why the guard is here, where the pivot
  // is built. The header stays, and the controls with it: whatever emptied the chart is a choice
  // in that row, so it has to remain reachable.
  if (groups.length === 0) {
    return (
      <Card>
        {header}
        <CardContent>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary" }}
          >
            Nothing to plot for the current selection.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <FoldedChart
      header={header}
      fold={() => {
        // The Totals reading, which is what a folded card's line and sparkline describe whatever
        // the View: the only view whose cells are the measure itself rather than a percentage of a
        // column or a place in one. `raw` is that reading in three views out of four, and under
        // Cumulative it is not — the domains bucket a climbing total by month, so the pivot above
        // is a couple of hundred month columns, which the line would name a peak in ("41 of 251
        // months") and the sparkline draw at a fraction of a pixel each. The rows are asked for
        // again at the grain `data(false)` gives, and the summary states that grain: on a tracked
        // tab under "In {year}" it is months, which is what the Totals view itself draws there.
        const totals = cumulative ? groupDate(data(false)) : { results: raw, dates, groups };
        const plotted = postAggregate
          ? totals.results.map((row) => row.map((value) => (value == null ? value : postAggregate(value))))
          : totals.results;

        return {
          summary: summaryLine(barchartSummary(plotted, totals.dates, totals.groups), unit),
          preview: <Sparkline values={columnTotals(plotted)} />,
        };
      }}
    >
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
    </FoldedChart>
  );
};

/**
 * The pivot as one line of words.
 *
 * Worded here rather than in `barchartData` because `format` is an `Intl.NumberFormat` on the
 * reader's own locale, and a locale is the one thing a pure test cannot pin.
 */
const summaryLine = (summary: BarchartSummary | undefined, unit: string) => {
  if (!summary) return "";

  const peak = `Peak ${summary.peak.label} · ${format(summary.peak.value)} ${unit.toLowerCase()}`;
  if (!summary.leader) return peak;

  const { name, columns } = summary.leader;
  return `${peak} · ${name} leads ${format(columns)} of ${format(summary.columns)} ${summary.grain}`;
};

export default Barchart;
