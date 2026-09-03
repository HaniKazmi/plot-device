import {
  Box,
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
  ROW_FOOTER_HEIGHT,
  Swatch,
  type CardMediaImageProps,
  type MediaBand,
  type TypedCardMediaImage,
} from "./Card";
import { dimSx, LABEL_SX, MUTED_FIGURE_SX } from "./typography";
import { SectionHeader } from "./SectionHeader";
import { shapeIsExact, shapeToAspect, shapeToRatio, type ArtworkShape } from "./cardArrangement";
import { rowCardSize } from "./rowSizing";
import { useElementWidth } from "./useElementWidth";
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
export const StatsListGrid = <T,>(
  props: {
    content: T[];
    flexWrap?: { xs: "nowrap"; md: "wrap" | "nowrap" };
    cardKey: (t: T) => string;
    labelComponent: (t: T) => string[][];
    chipComponent?: (t: T) => CardMediaImageProps["chip"];
    shape?: ArtworkShape;
    /** A band along the top of each card, and its height — see `CardMediaImageProps.mediaBand`. */
    band?: MediaBand<T>;
    divider?: boolean;
    MediaComponent: TypedCardMediaImage<T>;
    /**
     * The header over the cards, handed how many are drawn. Built here rather than above the
     * grid because only the grid knows: a sized row's cap is stated in rows, and how many cards
     * those hold follows from the width it measures.
     */
    header?: (shown: number) => ReactNode;
  } & GridLimit,
) => {
  const { content, flexWrap, cardKey, labelComponent, chipComponent, shape, band, divider, MediaComponent } = props;
  // The row's own width, which only a sized row reads: a grid needs none, and the observer is
  // only attached to the element a sized row renders.
  const [rowRef, rowWidth] = useElementWidth<HTMLDivElement>();
  const cell = cellOf(props, rowWidth, band?.height ?? 0);
  // A cap in rows is the solved row's count times over. A grid's limit is a count by type, so
  // its row of one is never asked.
  const perRow = "rowSize" in cell ? cell.rowSize.count : 1;
  const limit = typeof props.limit === "number" ? props.limit : props.limit.rows * perRow;

  // A sized row is not filled until it has been measured: the layout effect reads the width
  // before paint, so the empty row is never seen, where rendering the cards at a fallback size
  // first would build every one of them twice — a drill-down is up to five hundred.
  const drawn = props.rowSizing && rowWidth === undefined ? [] : content.slice(0, limit);
  const cards = drawn.map((entry) => (
    <StatsListCard
      key={cardKey(entry)}
      item={entry}
      labels={labelComponent(entry)}
      chip={chipComponent?.(entry)}
      cell={cell}
      shape={shape}
      band={band}
      divider={divider}
      MediaComponent={MediaComponent}
    />
  ));

  return (
    <>
      {props.header?.(drawn.length)}
      <CardContent>
        {"rowSize" in cell ? (
          <Box
            ref={rowRef}
            sx={{
              display: "flex",
              flexWrap: flexWrap ?? "wrap",
              gap: `${ROW_GAP}px`,
              overflow: "auto",
            }}
          >
            {cards}
          </Box>
        ) : (
          <Grid
            container
            spacing={1}
            sx={{
              alignItems: "center",
              overflow: "auto",
              flexWrap,
            }}
          >
            {cards}
          </Grid>
        )}
      </CardContent>
    </>
  );
};

/** Column spans per breakpoint for a list laid out as a grid: the strip's and the dialog's. */
export interface GridListLayout {
  pictureWidth: [number, number, number];
  dialogPictureWidth: [number, number, number];
}

/**
 * How a row of one-size cards is sized, in the terms its caller knows: the narrowest a card may
 * be, and how tall the picture stands at a width. The band, the footer and the border are the
 * list's own — it draws the first two and adds the third — so the list adds those to what the
 * caller states, and a caller says nothing about a footer it never sees. Both figures are the
 * card inside its border.
 */
export interface CardRowSizing {
  minWidth: number;
  pictureHeightFor: (width: number) => number;
}

/**
 * How a list lays its cards out, one way or the other.
 *
 * A grid seats every card in a cell at stated column spans. A sized row gives every card one
 * size, for a list whose cards declare a shape per item: the picture is sized by its shape and
 * the words take what it leaves, so a row mixing banners with posters is one height with no card
 * carrying ground under a shorter picture (`CardMediaImageProps.rowSize`). That size is solved
 * against the row's measured width (`rowCardSize`), so a whole number of cards fill it, and a
 * column span then means nothing to it. A union rather than two optional props, so a caller
 * cannot hand a sized row spans it will never read, and which mode a list is in can be read off
 * its props.
 */
export type GridLayout = { pictureWidth: [number, number, number]; rowSizing?: never };
export type RowLayout = { rowSizing: CardRowSizing; pictureWidth?: never };
export type CardLayout = GridLayout | RowLayout;

/**
 * The layout with how many cards it draws. A grid is capped in cards. A sized row may be capped in
 * rows instead, since how many cards a row holds follows from its measured width and any count of
 * cards would leave the last row part-filled at most widths.
 */
type GridLimit = (GridLayout & { limit: number }) | (RowLayout & { limit: number | { rows: number } });

/**
 * `CardLayout` for a list that also opens a dialog: a grid states a second set of spans, and a
 * sized row may state its collapsed cap in rows (`collapsedRows`), which then stands in for
 * `collapsed`.
 */
export type StatListLayout =
  | (GridListLayout & { rowSizing?: never; collapsedRows?: never })
  | { rowSizing: CardRowSizing; collapsedRows?: number; pictureWidth?: never; dialogPictureWidth?: never };

export interface StatListBaseProps<T> {
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
   * list. A sized row states its cap in rows instead (`StatListLayout`), since how many cards it
   * fits is not known until it is measured.
   */
  collapsed?: number;
  width: [number, number, number];
  nameComponent: (t: T) => string;
  labelComponent: (t: T) => string[][];
  MediaComponent: TypedCardMediaImage<T>;
  chipComponent?: (t: T) => CardMediaImageProps["chip"];
  shape?: ArtworkShape;
  /** See `StatsListGrid`: a band along the top of each card. */
  band?: MediaBand<T>;
  divider?: boolean;
  wrap?: boolean;
}

export type StatsListProps<T> = StatListBaseProps<T> & StatListLayout;

export const StatList = <T,>(props: StatsListProps<T>) => {
  const { icon, title, content, width, nameComponent, chipComponent, labelComponent, count, controls } = props;
  // Read off the props rather than defaulted in the pattern, which bails the component out of the
  // React Compiler.
  const wrap = props.wrap ?? true;
  const collapsed = props.collapsed ?? COLLAPSED_CARDS;
  // The layout and the cap the grid applies. The dialog lifts the cap to its own, and so does a
  // non-wrapping strip, which scrolls sideways instead of clipping and so holds the expanded count
  // without the card growing; a grid then takes the dialog's spans where it states a second set.
  const grid = (isDialog: boolean): GridLimit => {
    const everything = isDialog || !wrap;
    if (props.rowSizing) {
      const rows = props.collapsedRows;
      return {
        rowSizing: props.rowSizing,
        limit: everything ? EXPANDED_CARDS : rows !== undefined ? { rows } : collapsed,
      };
    }
    return {
      pictureWidth: isDialog ? props.dialogPictureWidth : props.pictureWidth,
      limit: everything ? EXPANDED_CARDS : collapsed,
    };
  };
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
        // A floor, since a cap in rows holds at least a card a row; the header below drops the
        // toggle once it knows everything is already drawn.
        expandable={content.length > (props.collapsedRows ?? collapsed)}
        renderContent={(isDialog, toggle) => (
          <StatsListGrid
            content={content}
            header={(shown) => (
              <SectionHeader
                title={title}
                icon={icon}
                count={count?.(shown, content.length)}
                action={
                  <Stack direction="row-reverse">
                    {(isDialog || !wrap || shown < content.length) && toggle}
                    {controls}
                  </Stack>
                }
              />
            )}
            flexWrap={isDialog ? undefined : { xs: "nowrap", md: wrap ? "wrap" : "nowrap" }}
            cardKey={(entry) => `${title}-statslistcard-${nameComponent(entry)}`}
            labelComponent={labelComponent}
            chipComponent={chipComponent}
            shape={props.shape}
            band={props.band}
            divider={props.divider}
            MediaComponent={props.MediaComponent}
            {...grid(isDialog)}
          />
        )}
      />
    </Grid>
  );
};

/** The outlined card's border, which a sized card's inner size is short by on each side. */
const CARD_BORDER = 1;

/** The gap between sized cards, in pixels: one spacing unit, stated so the sizing can count it. */
const ROW_GAP = 8;

/** What one card is seated by: its outer size in a sized row, its column spans in a grid. */
type CardCell =
  { rowSize: { width: number; height: number; count: number } } | { pictureWidth: [number, number, number] };

/**
 * A grid's cell is its spans as stated. A sized row's is solved from what the caller stated —
 * the card inside its border, the picture's height at a width — with what this shell adds on top:
 * the band it draws over the picture, the one-line footer it draws under a banner, and the
 * outlined border on each side. The row is solved on that outer size, which is what the card's
 * box takes; the card hands its media the inner one back.
 */
const cellOf = (layout: CardLayout, rowWidth: number | undefined, bandHeight: number): CardCell => {
  if (!layout.rowSizing) return { pictureWidth: layout.pictureWidth };
  const { minWidth, pictureHeightFor } = layout.rowSizing;
  return {
    rowSize: rowCardSize(
      {
        minWidth: minWidth + 2 * CARD_BORDER,
        heightFor: (width) =>
          bandHeight + pictureHeightFor(width - 2 * CARD_BORDER) + ROW_FOOTER_HEIGHT + 2 * CARD_BORDER,
      },
      rowWidth,
      ROW_GAP,
    ),
  };
};

const StatsListCard = <T,>({
  item,
  labels,
  chip,
  cell,
  shape,
  band,
  divider,
  MediaComponent,
}: {
  item: T;
  labels: string[][];
  chip?: CardMediaImageProps["chip"];
  cell: CardCell;
  shape?: ArtworkShape;
  band?: MediaBand<T>;
  divider?: boolean;
  MediaComponent: TypedCardMediaImage<T>;
}) => {
  const rowSize = "rowSize" in cell ? cell.rowSize : undefined;
  const card = (
    <Card
      variant="outlined"
      sx={{ height: "100%" }}
    >
      <MediaComponent
        item={item}
        // The card inside the border, which is what the row's size is spent on, and the footer
        // this list draws under a banner, which is what the picture's height is short by.
        rowSize={
          rowSize && {
            width: rowSize.width - 2 * CARD_BORDER,
            height: rowSize.height - 2 * CARD_BORDER,
            footerHeight: ROW_FOOTER_HEIGHT,
          }
        }
        mediaBand={band && { node: band.render(item), height: band.height }}
        // Applied here rather than handed on as `shape`, which `CardMediaImage` also takes and
        // means something else by: there it selects the arrangement, and this card supplies a
        // footer, so forwarding it would seat every poster's words in a column beside it —
        // the layout the Omnibus's mixed rows are alone in wanting.
        //
        // Held firmly, without the leading `auto` a wall's reservation uses: a strip lays its
        // cards out side by side and an artwork a few pixels off its shape would stand at a
        // different width from its neighbours, for a reason no reader can see. A cover is the
        // exception the shape declares — no two share a ratio, so held firmly it would be
        // cropped — and takes the reservation instead, standing at its file's own height.
        sx={{ aspectRatio: shape && (shapeIsExact(shape) ? shapeToRatio(shape) : shapeToAspect(shape)), flexShrink: 0 }}
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
  );

  // At one card size, a card is a flex item of that size; otherwise a grid cell.
  if (rowSize) return <Box sx={{ flex: "0 0 auto", width: rowSize.width, height: rowSize.height }}>{card}</Box>;

  const { pictureWidth } = cell as Extract<CardCell, { pictureWidth: unknown }>;
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
      {card}
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
