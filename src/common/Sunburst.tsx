import { CardContent, Stack, Typography, useTheme } from "@mui/material";
import { DonutLarge } from "@mui/icons-material";
import { Fragment, useLayoutEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type {} from "@mui/material/themeCssVarsAugmentation";
import { Chart, highchartsColors, SunburstSeries } from "../highcharts";
import { ProportionalBar } from "./Card";
import { FoldedChart } from "./FoldedChart";
import { SectionHeader } from "./SectionHeader";
import { SelectBox } from "./SelectionComponents";
import { useScheme } from "./useScheme";
import { useStackedCharts } from "./breakpoints";
import { neutralFill, type Colour } from "../utils/types";
import { keyLabel } from "../utils/stringUtils";
import { format } from "../utils/mathUtils";
import { LABEL_SX } from "./typography";
import { topNWithOther } from "./statsData";
import { firstRing, generateSunburstData, ringOptions, sunburstRoot, type SunburstEntry } from "./sunburstData";

/**
 * How tall the circle stands.
 *
 * A sunburst is a circle, so its diameter is capped by the width of the column it is in — past
 * that, extra height is empty ground. On a desktop that column is half a page and the ceiling is a
 * fixed figure, never past the `80vh` the barchart beside it takes. On a phone the card *is* the
 * page, so the width is the whole of it and the box is square: `80vh` there wraps a 340px wheel in
 * 400px of blank paper.
 */
const CHART_HEIGHT = { stacked: "min(calc(100vw - 64px), 480px)", beside: "min(80vh, 700px)" } as const;

/** How many wedges the folded preview names before the rest become one bucket. */
const PREVIEW_WEDGES = 5;

/**
 * Fades the outermost ring so leaf items read as detail rather than structure.
 * Lives outside the component because the React Compiler cannot compile a function
 * containing `this`, and Highcharts binds the chart to `this` on its render event.
 */
const dimLeafRing = (leafLevel: number) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function (this: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.series[0].points.forEach((point: any) => {
      if (point.node.level === leafLevel && point.graphic) {
        point.graphic.css({ opacity: 0.5 });
      }
    });
  };

const Sunburst = <T, K extends string>({
  title,
  count,
  data,
  controls,
  groups,
  options,
}: {
  /** What the chart is of, in the caller's own words — a shell cannot know it counts games. */
  title: string;
  count?: string;
  controls: ReactNode;
  data: T[];
  groups: K[];
  options: {
    keyToVal: (item: T, key: K) => string;
    getCount: (item: T) => number | undefined;
    getColor: (item: T, firstGroup: K) => Colour | undefined;
    getLeafName: (item: T) => string;
  };
}) => {
  const theme = useTheme();
  const stacked = useStackedCharts();
  const groupsKey = groups.join();
  /**
   * The reader's drill, held with the grouping it was made under. A drill names a path through one
   * hierarchy, so under another grouping it reads as no drill at all: a re-nest returns the reader
   * to the top of the new tree rather than mounting a chart already rooted partway down it, which
   * draws that subtree and no trail back out of it.
   */
  const [drill, setDrill] = useState({ groups: groupsKey, id: "" });
  const drilledId = drill.groups === groupsKey ? drill.id : "";
  const [rebuilds, setRebuilds] = useState(0);

  const generatedData = generateSunburstData(data, groups, options);
  // One ring per group, plus the leaf ring of individual items.
  const leafLevel = groups.length + 1;
  /**
   * The root is stated in the options on every render rather than left to the id Highcharts writes
   * into its own options as the reader drills: the wrapper applies a data or groups change as one
   * synchronous `chart.update`, and the chart translates inside that call, so a root the new data
   * holds no node for has to be reset in the options the update carries or the translate throws.
   */
  const root = sunburstRoot(generatedData, drilledId);
  const hide = root.atTop;
  /**
   * The chart is rebuilt rather than updated whenever the hierarchy it drew is not the one it is
   * handed. `chart.update` matches incoming nodes to the points the chart already holds by
   * position, so a re-nest — which rewrites every id below the first ring — leaves the wedges drawn
   * at the previous tree's angles: a leaf lands in the innermost ring and the circle draws as a fan
   * with gaps in it. A subset of the same ids (a filter) and the same ids at new values (the
   * measure toggle) both update faithfully, so those keep the animation from one state to the next.
   */
  const chartKey = `${groupsKey}-${rebuilds}`;

  /**
   * A drilled root that a filter has emptied out of the data is dropped, and the chart rebuilt
   * around the drop. The breadcrumb trail and the drilled geometry live in the chart instance, so
   * resetting the root through the options alone leaves the reader looking at rings sized for a
   * node that is gone, under a trail that still names it. Clearing the id is the other half: a
   * drill kept past the data that held it would take effect again the moment the same ids came
   * back, on a chart the reader had watched return to the top.
   */
  useLayoutEffect(() => {
    if (root.id === drilledId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrill({ groups: groupsKey, id: "" });
    setRebuilds((count) => count + 1);
  }, [root.id, drilledId, groupsKey]);

  return (
    <FoldedChart
      header={
        <SectionHeader
          icon={<DonutLarge />}
          title={title}
          count={count}
          action={controls}
        />
      }
      // The innermost ring is what both halves of the fold read, so it is flattened out of the
      // hierarchy once here rather than by each of them.
      fold={() => {
        const ring = firstRing(generatedData);
        return { summary: ringSummary(ring), preview: <RingBar ring={ring} /> };
      }}
    >
      <CardContent>
        <Chart
          key={chartKey}
          containerProps={{ style: { height: stacked ? CHART_HEIGHT.stacked : CHART_HEIGHT.beside } }}
          options={{
            chart: {
              backgroundColor: "transparent",
              style: {
                color: theme.vars.palette.text.primary,
              },
              events: {
                render: dimLeafRing(leafLevel),
              },
            },
          }}
        >
          <SunburstSeries
            data={generatedData}
            options={{
              allowTraversingTree: true,
              rootId: root.id,
              name: "All",
              events: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setRootNode: (event: any) => {
                  setDrill({ groups: groupsKey, id: event.newRootId });
                },
              },
              levels: [
                {
                  level: 1,
                  colorByPoint: true,
                },
                {
                  level: leafLevel,
                  dataLabels: {
                    enabled: !hide,
                  },
                  levelSize: {
                    value: hide ? 0 : 1,
                  },
                },
              ],
            }}
          />
        </Chart>
      </CardContent>
    </FoldedChart>
  );
};

/**
 * The innermost ring named and counted, largest first — what the wheel says before a reader drills
 * anywhere. Worded here rather than in `sunburstData` because `format` reads the machine's locale.
 */
const ringSummary = (ring: SunburstEntry[]) =>
  ring
    .slice(0, PREVIEW_WEDGES)
    .map((entry) => `${entry.name} ${format(Math.round(entry.value))}`)
    .join(" · ");

/**
 * The first ring as a proportional bar: the wheel's own reading, flattened.
 *
 * The colour policy is the Top lists' — "Other" wears the neutral, and a wedge its own
 * vocabulary's colour, which is the colour the chart draws it in. A grouping with no vocabulary
 * falls to a series colour by rank here and to Highcharts' own `colorByPoint` in the wheel, which
 * runs in id order: the bar and the wedge then differ, and the names beneath the bar are what say
 * which is which.
 */
const RingBar = ({ ring }: { ring: SunburstEntry[] }) => {
  const scheme = useScheme();
  const colours = new Map(ring.map((entry) => [entry.name, entry.color]));
  const wedges = topNWithOther(
    ring.map((entry) => ({ name: entry.name, count: entry.value })),
    PREVIEW_WEDGES,
  );

  if (wedges.length === 0) return null;

  return (
    <ProportionalBar
      items={wedges.map((wedge, index) => ({
        name: wedge.name,
        percent: wedge.percent,
        colour:
          wedge.name === "Other"
            ? neutralFill(scheme)
            : (colours.get(wedge.name) ?? highchartsColors[index % highchartsColors.length]),
      }))}
    />
  );
};

/**
 * The rings, as one labelled row: what the hierarchy nests by, outermost ring last.
 *
 * A stack of bare selects says nothing about what it does or which order it reads in — three
 * dropdowns holding model keys are three unrelated settings until something names them. The word
 * says what the row is for; the chevrons say the row is a path and which way it runs, which is the
 * one thing about a nesting order that cannot be recovered from the values.
 *
 * `labels` is where a domain overrides a key whose own name means the wrong thing on screen — a
 * `show` ring is grouping by the show's *name*, and the key alone reads as the medium.
 */
export const SunBurstControls = <T extends string>({
  controlStates,
  setControlStates,
  options,
  labels,
}: {
  controlStates: T[];
  setControlStates: Dispatch<SetStateAction<T[]>>;
  options: readonly T[];
  labels?: Partial<Record<T, string>>;
}) => {
  const menus = ringOptions(options, controlStates);

  return (
    <Stack
      direction="row"
      // Tighter around the chevrons where the row has to hold three rings in a phone's card width.
      spacing={{ xs: 0.5, sm: 1 }}
      // A gap rather than margins, so the label dropped below `sm` takes its own spacing with it —
      // a `display: none` sibling still earns the next child its margin.
      useFlexGap
      sx={{
        alignItems: "center",
        flexWrap: "wrap",
        // Two rings to a line at the one width where three do not fit. `CardHeader` sizes its
        // action to whatever the controls ask for and gives the title what is left, so a row
        // asking for all three — 317px — leaves the heading beside it 96px in the 418px card
        // `ChartPair` makes of a 900px page, and four lines to say "Where the books went" in. A
        // break in the controls is one the reader absorbs; a heading read down a column is not.
        // Uncapped either side of that: below `md` the card is the full page, and from `lg` half
        // of one is 580px, where the title and all three rings sit on one line together.
        maxWidth: { xs: "none", md: 220, lg: "none" },
      }}
    >
      {/* Dropped on a phone, where the three rings and the word do not share a line: at 390 the
          card is 324px and the row asks for 379, so the last ring wraps under the label and the
          control stands two rows tall on a page the fold is there to shorten. The word is what
          says the row is a nesting order to a reader meeting it — the chevrons say the rest, and
          on the one width where only one of the two fits, they are the half that cannot be
          inferred from the values. */}
      <Typography
        variant="caption"
        sx={{ ...LABEL_SX, color: "text.secondary", display: { xs: "none", sm: "inline" } }}
      >
        Nest by
      </Typography>
      {controlStates.map((val, index) => (
        <Fragment key={"sunburst-control-" + index}>
          {index > 0 && (
            <Typography
              aria-hidden
              variant="caption"
              sx={{ color: "text.secondary" }}
            >
              ›
            </Typography>
          )}
          <SelectBox
            options={menus[index]}
            value={val}
            setValue={(key) => setControlStates(controlStates.with(index, key))}
            labelFor={(key) => labels?.[key] ?? keyLabel(key)}
          />
        </Fragment>
      ))}
    </Stack>
  );
};

export default Sunburst;
