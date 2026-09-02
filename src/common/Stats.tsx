import {
  Card,
  CardContent,
  CardHeader,
  Dialog,
  Divider,
  IconButton,
  Stack,
  type SxProps,
  type Theme,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { format } from "../utils/mathUtils";
import { groupTotals } from "./statsData";
import {
  FooterComponent,
  INLINE_SWATCH_SIZE,
  ProportionalBar,
  Swatch,
  type CardMediaImageProps,
  type TypedCardMediaImage,
} from "./Card";
import { dimSx, LABEL_SX, MUTED_FIGURE_SX } from "./typography";
import { SectionHeader } from "./SectionHeader";
import { shapeToRatio, type ArtworkShape } from "./cardArrangement";
import { useState, type ReactNode } from "react";
import { Radio } from "@mui/material";
import type { Colour } from "../utils/types";
import { YearSelect } from "./YearSelect";
import type { YearType } from "./filterReducer";
import { CURRENT_YEAR, type YearNumber } from "./date";
import { CloseFullscreen, Fullscreen, Timer, Update } from "@mui/icons-material";
import { useDialogMount } from "./useDialogMount";

export const StatCard = ({
  icon,
  title,
  action,
  content,
}: {
  icon: ReactNode;
  title: ReactNode;
  action?: ReactNode;
  content: [string, number][];
}) => {
  const formattedContent = (
    <Stack
      divider={
        <Divider
          orientation="vertical"
          flexItem
        />
      }
      direction={"row"}
      sx={{
        justifyContent: "space-evenly",
      }}
    >
      {content.map(([key, val]) => (
        <Stack
          key={key}
          direction={"column"}
          sx={{
            flex: "1 1 0",
          }}
        >
          <Typography
            align="center"
            variant="h5"
            // A row of figures that refresh under the filters, so proportional digits would move
            // each one sideways as its own width changed while its neighbours stood still.
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {format(val)}
          </Typography>
          <Typography
            align="center"
            variant="subtitle2"
            sx={{
              color: "text.secondary",
            }}
          >
            {key}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
  return (
    <Grid
      size={{
        xs: 12,
        sm: 6,
        md: 3,
      }}
    >
      <Card sx={{ height: "100%" }}>
        <CardHeader
          title={title}
          avatar={icon}
          sx={{ paddingBottom: "5px" }}
          action={action}
          slotProps={{
            title: { variant: "h6" },
          }}
        />
        <CardContent sx={{ paddingTop: "5px" }}>{formattedContent}</CardContent>
      </Card>
    </Grid>
  );
};

/** Each `statsData` total is already keyed by the label it renders under, in display order. */
export const StatSummary = ({
  icon,
  title,
  stats,
}: {
  icon: ReactNode;
  title: string;
  stats: Record<string, number>;
}) => (
  <StatCard
    icon={icon}
    title={title}
    content={Object.entries(stats).map(([key, value]) => [key[0].toUpperCase() + key.slice(1), value])}
  />
);

/**
 * Typed as exactly the two actions these cards send, so every domain's dispatch — each a
 * `FilterDispatchFor` over its own wider state — fits structurally without a generic.
 */
type YearDispatch = (
  action: { type: "updateFilter"; filter: "yearTo"; value: YearNumber } | { type: "toggleYearType" },
) => void;

/**
 * The vitals card carrying the page-wide year controls: a year select as its title and the radio
 * that picks which of the two year cards the filter applies to, hence `activeYearType`. The
 * figures themselves arrive as a keyed record, already scoped by the caller to whatever the card
 * claims to total.
 */
const YearTotals = ({
  yearType,
  yearTo,
  filterDispatch,
  icon,
  activeYearType,
  minWidth,
  earliestYear,
  stats,
  renderValue,
}: {
  yearType: YearType;
  yearTo: YearNumber;
  filterDispatch: YearDispatch;
  icon: ReactNode;
  activeYearType: YearType;
  minWidth?: number;
  /** Passed through to the year select, which takes no floor of its own. */
  earliestYear: YearNumber;
  stats: Record<string, number>;
  renderValue: (value: number) => ReactNode;
}) => (
  <StatCard
    icon={icon}
    title={
      <YearSelect
        value={yearTo}
        onChange={(value) => filterDispatch({ type: "updateFilter", filter: "yearTo", value })}
        minWidth={minWidth}
        earliestYear={earliestYear}
        renderValue={renderValue}
      />
    }
    action={
      <Radio
        size="small"
        checked={yearType == activeYearType}
        onChange={() => filterDispatch({ type: "toggleYearType" })}
      />
    }
    content={Object.entries(stats).map(([key, value]) => [key[0].toUpperCase() + key.slice(1), value])}
  />
);

/**
 * The pair of year cards every tab opens its vitals band with: the library up to a year, and the
 * library inside it.
 *
 * They are one component rather than two placed side by side at each of the four call sites,
 * because everything that makes them a pair is fixed — the two icons, which of them the radio
 * marks active, the wording of each title, and the wider select the second needs for "In 2024".
 * What a tab actually varies is the two sets of figures it counts, and a tab that stated the rest
 * again could state it differently.
 *
 * A fragment rather than a container: they are two cards of the band they sit in, beside whatever
 * else that tab puts there, not a group within it.
 */
export const YearVitalsPair = ({
  yearTo,
  yearType,
  filterDispatch,
  earliestYear,
  allTime,
  inYear,
}: {
  yearTo: YearNumber;
  yearType: YearType;
  filterDispatch: YearDispatch;
  /** Passed through to both year cards' selects, which take no floor of their own. */
  earliestYear: YearNumber;
  allTime: Record<string, number>;
  inYear: Record<string, number>;
}) => (
  <>
    <YearTotals
      yearTo={yearTo}
      yearType={yearType}
      filterDispatch={filterDispatch}
      icon={<Timer />}
      activeYearType="upto"
      earliestYear={earliestYear}
      stats={allTime}
      renderValue={(value) => (
        <Typography variant="h6">{value == CURRENT_YEAR ? "All Time" : `Up To ${value}`}</Typography>
      )}
    />
    <YearTotals
      yearTo={yearTo}
      yearType={yearType}
      filterDispatch={filterDispatch}
      icon={<Update />}
      activeYearType="matching"
      minWidth={120}
      earliestYear={earliestYear}
      stats={inYear}
      renderValue={(value) => <Typography variant="h6">In {value}</Typography>}
    />
  </>
);

/**
 * How many cards a strip shows collapsed, and how many its fullscreen dialog shows.
 *
 * The collapsed figure is what a half-width card holds without growing past the charts beside it;
 * a strip laid out differently passes its own through `StatList`'s `collapsed`.
 */
const COLLAPSED_CARDS = 6;
export const EXPANDED_CARDS = 500;

/**
 * A card that can also present itself fullscreen.
 *
 * `renderContent` is called twice — once inline, once for the dialog — and is handed the
 * expand/collapse control to place wherever its header wants it. Only the body is gated on
 * `useDialogMount`'s `mounted`, so a strip of media cards is not built a second time behind a
 * closed dialog while the one `Dialog` this card holds stays where it is.
 */
export const ExpandableCard = ({
  renderContent,
  expandable: expandableProp,
  sx,
}: {
  renderContent: (isDialog: boolean, toggle: ReactNode) => ReactNode;
  expandable?: boolean;
  sx?: SxProps<Theme>;
}) => {
  // Applied after the pattern: a default inside it bails the component out of the React Compiler.
  const expandable = expandableProp ?? true;
  const dialog = useDialogMount();

  // The dialog always keeps its control, whatever `expandable` says. It is fullscreen with no
  // `onClose`, so the button is the only way out, and a caller whose content shrinks while it is
  // open — a select box in the header switching to a category with fewer groups — would
  // otherwise strand the reader with nothing to click.
  const toggle = (isDialog: boolean) =>
    expandable || isDialog ? (
      <IconButton onClick={() => (isDialog ? dialog.hide() : dialog.show())}>
        {isDialog ? <CloseFullscreen color="primary" /> : <Fullscreen />}
      </IconButton>
    ) : null;

  return (
    <Card sx={sx}>
      {renderContent(false, toggle(false))}
      <Dialog
        open={dialog.open}
        fullScreen
        slotProps={{ transition: { onExited: dialog.onExited } }}
      >
        {dialog.mounted && renderContent(true, toggle(true))}
      </Dialog>
    </Card>
  );
};

/**
 * A strip of media cards, capped so a long list does not render in full.
 *
 * `limit` is passed in because how much fits depends on how the strip is laid out, but it is
 * meant to come from `COLLAPSED_CARDS` / `EXPANDED_CARDS` rather than a literal. Slicing here
 * rather than before the call is what keeps those constants meaningful — a caller that trimmed
 * its own list first would silently ignore any change to them.
 */
export const StatsListGrid = <T,>({
  content,
  limit,
  flexWrap,
  cardKey,
  labelComponent,
  chipComponent,
  ...props
}: {
  content: T[];
  limit: number;
  flexWrap?: { xs: "nowrap"; md: "wrap" | "nowrap" };
  cardKey: (t: T) => string;
  labelComponent: (t: T) => string[][];
  chipComponent?: (t: T) => CardMediaImageProps["chip"];
  pictureWidth: [number, number, number];
  shape?: ArtworkShape;
  divider?: boolean;
  MediaComponent: TypedCardMediaImage<T>;
}) => (
  <CardContent>
    <Grid
      container
      spacing={1}
      sx={{
        alignItems: "center",
        overflow: "auto",
        flexWrap,
      }}
    >
      {content.slice(0, limit).map((entry) => (
        <StatsListCard
          key={cardKey(entry)}
          item={entry}
          labels={labelComponent(entry)}
          chip={chipComponent?.(entry)}
          {...props}
        />
      ))}
    </Grid>
  </CardContent>
);

export interface StatsListProps<T> {
  icon: ReactNode;
  title: string;
  controls?: ReactNode;
  content: T[];
  /**
   * The population the header states, worded by the caller — a shell cannot know it is counting
   * seasons. It is given how many cards are actually drawn as well as how many there are, because
   * the strip is capped and a cut a header does not state is a cut the reader cannot see.
   */
  count?: (shown: number, total: number) => string;
  /**
   * How many cards the collapsed strip holds, where `COLLAPSED_CARDS` is the wrong number for how
   * this one is laid out. The cap still applies inside the shell — a caller that sliced its own
   * list would make the constant a no-op for it — so what is passed is the limit and never the
   * list. A full-width strip at three columns fits four cards to a row, and the shared six leave
   * the second row half empty.
   */
  collapsed?: number;
  width: [number, number, number];
  nameComponent: (t: T) => string;
  labelComponent: (t: T) => string[][];
  MediaComponent: TypedCardMediaImage<T>;
  chipComponent?: (t: T) => CardMediaImageProps["chip"];
  pictureWidth: [number, number, number];
  dialogPictureWidth: [number, number, number];
  shape?: ArtworkShape;
  divider?: boolean;
  wrap?: boolean;
}

export const StatList = <T,>({
  icon,
  title,
  content,
  width,
  nameComponent,
  chipComponent,
  labelComponent,
  count,
  // Renamed and defaulted below the pattern: a default inside it bails the component out of the
  // React Compiler, and the rename keeps `wrap` and `collapsed` out of the rest object handed to
  // `StatsListGrid`.
  wrap: wrapProp,
  collapsed: collapsedProp,
  pictureWidth,
  dialogPictureWidth,
  controls,
  ...props
}: StatsListProps<T>) => {
  const wrap = wrapProp ?? true;
  const collapsed = collapsedProp ?? COLLAPSED_CARDS;
  return (
    <Grid
      size={{
        xs: width[0],
        sm: width[1],
        md: width[2],
      }}
    >
      <ExpandableCard
        sx={{ height: "100%" }}
        expandable={content.length > collapsed}
        renderContent={(isDialog, toggle) => {
          // A non-wrapping strip scrolls sideways instead of clipping, so it can hold the expanded
          // count without the card growing. Answered once and shared, so the header states the cut
          // the grid actually applies.
          const limit = isDialog || !wrap ? EXPANDED_CARDS : collapsed;

          return (
            <>
              <SectionHeader
                title={title}
                icon={icon}
                count={count?.(Math.min(content.length, limit), content.length)}
                action={
                  <Stack direction="row-reverse">
                    {toggle}
                    {controls}
                  </Stack>
                }
              />
              <StatsListGrid
                content={content}
                limit={limit}
                flexWrap={isDialog ? undefined : { xs: "nowrap", md: wrap ? "wrap" : "nowrap" }}
                cardKey={(entry) => `${title}-statslistcard-${nameComponent(entry)}`}
                labelComponent={labelComponent}
                chipComponent={chipComponent}
                pictureWidth={isDialog ? dialogPictureWidth : pictureWidth}
                {...props}
              />
            </>
          );
        }}
      />
    </Grid>
  );
};

const StatsListCard = <T,>({
  item,
  labels,
  chip,
  pictureWidth,
  shape,
  divider,
  MediaComponent,
}: {
  item: T;
  labels: string[][];
  chip?: CardMediaImageProps["chip"];
  pictureWidth: [number, number, number];
  shape?: ArtworkShape;
  divider?: boolean;
  MediaComponent: TypedCardMediaImage<T>;
}) => {
  return (
    <Grid
      size={{
        xs: pictureWidth[0],
        sm: pictureWidth[1],
        md: pictureWidth[2],
      }}
      sx={{
        flexShrink: 0,
        alignSelf: "stretch",
      }}
    >
      <Card
        variant="outlined"
        sx={{ height: "100%" }}
      >
        <MediaComponent
          item={item}
          // Applied here rather than handed on as `shape`, which `CardMediaImage` also takes and
          // means something else by: there it selects the arrangement, and this card supplies a
          // footer, so forwarding it would seat every poster's words in a column beside it —
          // the layout the Omnibus's mixed rows are alone in wanting.
          //
          // Held firmly, without the leading `auto` a wall's reservation uses: a strip lays its
          // cards out side by side and an artwork a few pixels off its shape would stand at a
          // different width from its neighbours, for a reason no reader can see.
          sx={{ aspectRatio: shape && shapeToRatio(shape), flexShrink: 0 }}
          chip={chip}
          // A dialog list can run to hundreds of cards; off-screen artwork loads as it scrolls
          // into view rather than all at once on open.
          lazy
          extractColour
          footerComponent={
            <FooterComponent
              labels={labels}
              divider={divider}
            />
          }
        />
      </Card>
    </Grid>
  );
};

/**
 * The card the vitals bands sit in — one card however many bands a domain stacks in it.
 *
 * A band has no card of its own because two of them side by side spent most of a screen saying
 * what the library is made of. Sharing the card is what makes them read as one figure at one
 * altitude rather than as two competing summaries.
 */
export const VitalsCard = ({ children }: { children: ReactNode }) => (
  <Grid size={12}>
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ ":last-child": { paddingBottom: 2 } }}>
        <Stack spacing={2}>{children}</Stack>
      </CardContent>
    </Card>
  </Grid>
);

/**
 * What a library is made of, as one proportional bar and a legend: statuses, platforms.
 *
 * Read at a glance rather than studied, so the legend wraps along one line beside the figures
 * instead of standing each group in a column of its own — five groups as five headings, five
 * figures and a swatch each is a card the height of the charts it is meant to introduce.
 */
export const TotalsBand = <T extends string, U>(props: {
  title: string;
  data: U[];
  /** How much each group counts for. Its own size, where a domain has nothing else to measure. */
  measureFunc?: (data: U[]) => number;
  group: T[];
  /** The group an item belongs to — a field read, or a derivation like a score band. */
  groupOf: (item: U) => T;
  groupToColour: (ele: T) => Colour;
  /** How a group value reads in the legend, where the sheet's own casing should not. */
  groupToLabel?: (ele: T) => string;
  icon: ReactNode;
  measureLabel: string;
}) => {
  const { title, data, measureFunc, group, groupOf, groupToColour, icon, measureLabel } = props;
  // Read off `props` rather than defaulted in the destructuring pattern — a default there bails
  // the component out of the React Compiler.
  const groupToLabel = props.groupToLabel ?? String;
  const totals = groupTotals(data, group, groupOf, measureFunc ?? countOf, groupToColour);
  // Held per band rather than per card: a card stacks several bands, and hovering one group of a
  // library should not fade the band answering a different question.
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <Stack spacing={1}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", color: "text.secondary" }}
      >
        {icon}
        <Typography
          variant="subtitle2"
          sx={LABEL_SX}
        >
          {title}
        </Typography>
      </Stack>
      <ProportionalBar
        items={totals}
        hovered={hovered}
        onHover={setHovered}
      />
      {/* Wrapping rather than a column each: the legend is as wide as the words in it, so however
        many groups there are they fill the lines they need and stop. */}
      <Stack
        direction="row"
        sx={{ flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}
      >
        {totals.map((struct) => (
          <Stack
            key={struct.name}
            direction="row"
            spacing={0.75}
            onMouseEnter={() => setHovered(struct.name)}
            onMouseLeave={() => setHovered(null)}
            sx={{
              alignItems: "center",
              ...dimSx(hovered, struct.name),
            }}
          >
            <Swatch
              colour={struct.colour}
              size={INLINE_SWATCH_SIZE}
            />
            <Typography variant="body2">{groupToLabel(struct.name)}</Typography>
            <Typography
              variant="body2"
              sx={MUTED_FIGURE_SX}
            >
              {`${format(struct.count)} ${measureLabel}`}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

/** A group's own size, which is what a domain with nothing else to measure counts by. */
const countOf = (data: unknown[]) => data.length;
