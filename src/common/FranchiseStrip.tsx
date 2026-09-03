import { Box, Stack, Typography } from "@mui/material";
import { useState, type ReactNode } from "react";
import { MEDIA, franchiseToColour, mediumToColour, mediumUnit, pick, type Medium } from "../utils/types";
import { useArtworkPalette, type artworkPalette } from "./artworkPalette";

type Palette = ReturnType<typeof artworkPalette>;
import { INLINE_SWATCH_SIZE, Swatch, TimelineScale } from "./Card";
import { SegmentedControl, type SegmentOption } from "./SelectionComponents";
import { shortYear, type YearMonthDay } from "./date";
import type { FranchiseEntry } from "./franchiseUnion";
import { HoverCardTooltip } from "./HoverCardTooltip";
import { LazyTooltip } from "./LazyTooltip";
import { percentAtDate, percentOfSpan } from "./timelineLayout";
import {
  beadsPerRow,
  buildStrip,
  stripWindow,
  stripYearTicks,
  yearLabelEvery,
  type StripBand,
} from "./timelineStripData";
import { useElementWidth } from "./useElementWidth";
import { useScheme } from "./useScheme";
import "../utils/arrayUtils";

/**
 * The two ways a franchise is drawn: in the order its entries were met, one bead each, evenly
 * spaced; or against time, on a window of the franchise's own years.
 */
type StripMode = "order" | "time";

/**
 * Where a strip stands. A card's strip offers both readings and wraps its chain; the hero's is
 * held to the order reading with no switch, keeps its chain to one row (a panel held to the
 * artwork's height cannot grow for a second), and is dropped between `md` and `lg`, where the
 * column beside a banner wraps the title and a wrapped title with a strip outgrows the picture.
 */
export type StripVariant = "card" | "hero";

const CARD_STRIP_SX = { borderRadius: 1, padding: 1, marginBottom: 1 } as const;
const HERO_STRIP_SX = { borderRadius: 1, padding: 1, display: { xs: "block", md: "none", lg: "block" } } as const;

/**
 * The mode a strip opens in: the one the reader last chose. A preference is about how the reader
 * likes to read a series rather than about one card, so it carries from card to card for the life
 * of the page and starts over on a reload, where it starts on the order.
 */
let preferredMode: StripMode = "order";

const STRIP_MODES: readonly SegmentOption<StripMode>[] = [
  { value: "order", label: "Order" },
  { value: "time", label: "Time" },
];

/**
 * A franchise on an expanded card or the hero: every entry the reader has met across the four
 * media, with the card's own item singled out.
 *
 * Marks wear the medium's fill and nothing more: the platform, status or genre a strip could
 * colour by is already stated in the ledger below it, and a second vocabulary on marks a few
 * pixels wide is one nobody can read. The subject is set apart by a ring, not by colour or by a
 * name: a name beside a mark covers its neighbours on a chain of fifty, and the hover card names
 * the mark for anyone who asks. A card about one entry of a series rings that entry; a show's card
 * rings every season of the show and, harder, the season the card is about.
 *
 * The strip stands in a well: a wash of the card's own ground, the tone its tiles are lifted
 * with, edged in the card's hairline, so it reads as a part of the card it is in. The theme's
 * paper is what every fill is solved against, but a paper plate inside a card the artwork has
 * coloured is a white rectangle in a navy card, and the card's own ground with nothing drawn
 * around the marks leaves the chain floating between the subtitle and the ledger. What the well
 * gives up is the contract: a medium's fill on an artwork tint is not a pair the tables checked,
 * so every mark carries a hairline ring in the card's line tone and is legible by its shape
 * whatever the fill lands on, with the fill left to say which medium and the legend beside it
 * saying so in words.
 */
export const FranchiseStrip = (props: {
  entries: FranchiseEntry[];
  /** The `subject` the card's own item answers; every entry answering it is the subject. */
  subject: string;
  /**
   * The one entry the card is about, by its key, where the subject is wider than it — a show's
   * card is about its latest season, or the one it was opened from. Absent, the subject is the
   * focus.
   */
  focus?: string;
  franchise: string;
  /** Where the context bar's fixed scale opens: the tab's own epoch. */
  epoch: YearMonthDay;
  today: YearMonthDay;
  variant?: StripVariant;
}) => {
  const { entries, subject, franchise, epoch, today } = props;
  const hero = props.variant === "hero";
  const palette = useArtworkPalette();
  const [chosen, setChosen] = useState<StripMode>(preferredMode);
  const mode = hero ? "order" : chosen;

  const ordered = entries.sortByKey("start", true);
  // Whether the subject has anything to stand apart from: a show that is the whole of its
  // franchise has no sibling on the strip, and ringing every one of its seasons says nothing.
  const contextual = ordered.some((entry) => entry.subject !== subject);
  const markOf = (entry: FranchiseEntry): Mark => {
    if (entry.key === props.focus || (props.focus === undefined && entry.subject === subject)) return "focus";
    if (entry.subject !== subject) return "none";
    return contextual ? "subject" : "plain";
  };
  const window = stripWindow(ordered);
  // The order reading needs no range: the beads are the order, and the years beneath say when.
  const range =
    mode === "order" ? undefined : `${window.from.year} – ${window.to.year >= today.year ? "today" : window.to.year}`;

  return (
    <Box
      sx={hero ? HERO_STRIP_SX : CARD_STRIP_SX}
      style={{ color: palette.onGround, backgroundColor: palette.tile, border: `1px solid ${palette.line}` }}
    >
      <Caption
        franchise={franchise}
        entries={ordered}
        range={range}
        control={
          !hero && (
            <SegmentedControl
              options={STRIP_MODES}
              value={mode}
              tone={palette}
              onChange={(next) => {
                preferredMode = next;
                setChosen(next);
              }}
              ariaLabel="How the franchise is drawn"
            />
          )
        }
      />
      {mode === "order" ? (
        <BeadChain
          entries={ordered}
          markOf={markOf}
          fit={hero ? "shrink" : "wrap"}
        />
      ) : (
        <WindowedStrip
          entries={ordered}
          markOf={markOf}
          epoch={epoch}
          today={today}
        />
      )}
    </Box>
  );
};

/**
 * The strip's own legend: the franchise, then every medium it holds counted in its own unit and
 * wearing its fill — which is what makes an unlabelled bead readable — then which of the two
 * readings the marks below give.
 */
const Caption = ({
  franchise,
  entries,
  range,
  control,
}: {
  franchise: string;
  entries: FranchiseEntry[];
  range?: string;
  control: ReactNode;
}) => {
  const scheme = useScheme();
  const palette = useArtworkPalette();
  // One pass over the entries rather than a filter per medium.
  const counts = new Map<Medium, number>();
  for (const entry of entries) counts.set(entry.medium, (counts.get(entry.medium) ?? 0) + 1);

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: "center", flexWrap: "wrap", marginBottom: 0.5 }}
    >
      {/* The franchise wears the swatch its Top list and ledger rows wear, where the table has one. */}
      <FranchiseName franchise={franchise} />
      {MEDIA.map((medium) => {
        const count = counts.get(medium) ?? 0;
        return (
          count > 0 && (
            <Stack
              key={medium}
              direction="row"
              spacing={0.5}
              sx={{ alignItems: "center" }}
            >
              <Swatch
                colour={mediumToColour(medium, scheme)}
                size={INLINE_SWATCH_SIZE}
              />
              <Typography variant="caption">{mediumUnit(medium, count)}</Typography>
            </Stack>
          )
        );
      })}
      {range && (
        <Typography
          variant="caption"
          style={{ color: palette.muted }}
        >
          {range}
        </Typography>
      )}
      <Box sx={{ flex: 1 }} />
      {control}
    </Stack>
  );
};

/** A franchise's name with the swatch the app paints it elsewhere, where the table holds one. */
export const FranchiseName = ({ franchise }: { franchise: string }) => {
  const colour = franchiseToColour({ franchise }, useScheme());
  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ alignItems: "center", minWidth: 0 }}
    >
      {colour && (
        <Swatch
          colour={colour}
          size={INLINE_SWATCH_SIZE}
        />
      )}
      <Typography
        variant="caption"
        noWrap
        sx={{ fontWeight: 700 }}
      >
        {franchise}
      </Typography>
    </Stack>
  );
};

/** A bead, the one the card is about, and the least a bead closed up on a hero's row may be. */
const BEAD = 12;
const SUBJECT_BEAD = 16;
const MIN_BEAD = 6;
/** The least a bead and the gap after it take, which is what decides when the chain wraps. */
const MIN_PITCH = 28;
/** Rows of the chain: the bead and its line, a year beneath. */
const BEAD_ROW = 20;
const YEAR_HEIGHT = 12;
const ROW_HEIGHT = BEAD_ROW + YEAR_HEIGHT;
const BEAD_CENTRE = BEAD_ROW / 2;
/** Drawn at before the row is measured, which is about a card's width. */
const UNMEASURED_WIDTH = 1200;

/**
 * Every entry as one bead on a line, in the order met, evenly spaced whatever the dates between
 * them. Time is dropped entirely — a four-year gap and a four-day gap are the same space — which
 * is what keeps a bead the same size on a fifty-entry franchise as on a five-entry one; the years
 * beneath, stated only where they change, are what is left of it.
 *
 * The chain wraps like a line of text once the beads would fall closer than their minimum pitch,
 * and each row's line stops at its first and last bead rather than running to the edge, so a
 * wrapped chain reads as one that turned rather than one that broke.
 */
const BeadChain = ({
  entries,
  markOf,
  fit,
}: {
  entries: FranchiseEntry[];
  markOf: (entry: FranchiseEntry) => Mark;
  /**
   * What gives when the beads would fall closer than their pitch: `wrap` turns the chain onto
   * another row, `shrink` keeps one row and closes the beads up, smaller, with the years stated
   * only at the ends once there is no room to state them where they change.
   */
  fit: "wrap" | "shrink";
}) => {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const measured = width ?? UNMEASURED_WIDTH;
  const perRow = fit === "wrap" ? beadsPerRow(entries.length, measured, MIN_PITCH) : entries.length;
  const pitch = measured / perRow;
  const cramped = pitch < MIN_PITCH;
  // A bead never wider than the space it has, and never so small it stops being a mark.
  const bead = cramped ? Math.max(MIN_BEAD, Math.floor(pitch) - 4) : BEAD;
  const focusBead = cramped ? bead + 4 : SUBJECT_BEAD;
  const rows: FranchiseEntry[][] = [];
  for (let start = 0; start < entries.length; start += perRow) rows.push(entries.slice(start, start + perRow));

  return (
    <Box ref={ref}>
      {rows.map((row, rowIndex) => (
        <Box
          key={rowIndex}
          sx={{ display: "flex" }}
        >
          {row.map((entry, column) => {
            const index = rowIndex * perRow + column;
            const yearShown = cramped
              ? index === 0 || index === entries.length - 1
              : index === 0 || entries[index - 1].start.year !== entry.start.year;
            const mark = markOf(entry);
            return (
              <Bead
                key={entry.key}
                entry={entry}
                mark={mark}
                size={mark === "focus" ? focusBead : bead}
                lineLeft={column > 0}
                lineRight={column < row.length - 1}
                year={yearShown ? shortYear(entry.start.year) : undefined}
                widthPercent={100 / perRow}
              />
            );
          })}
        </Box>
      ))}
    </Box>
  );
};

const LINE_SX = { position: "absolute", top: BEAD_CENTRE - 1, height: 2 } as const;

const Bead = ({
  entry,
  mark,
  size,
  lineLeft,
  lineRight,
  year,
  widthPercent,
}: {
  entry: FranchiseEntry;
  mark: Mark;
  size: number;
  lineLeft: boolean;
  lineRight: boolean;
  year?: string;
  widthPercent: number;
}) => {
  const scheme = useScheme();
  const palette = useArtworkPalette();
  const colour = pick(entry.fill, scheme);

  return (
    <Box
      sx={{ position: "relative", height: ROW_HEIGHT }}
      style={{ flex: `0 0 ${widthPercent}%` }}
    >
      {lineLeft && (
        <Box
          sx={{ ...LINE_SX, left: 0, width: "50%" }}
          style={{ backgroundColor: palette.line }}
        />
      )}
      {lineRight && (
        <Box
          sx={{ ...LINE_SX, right: 0, width: "50%" }}
          style={{ backgroundColor: palette.line }}
        />
      )}
      <HoverCardTooltip
        colour={colour}
        title={<LazyTooltip render={entry.hoverCard} />}
        placement="top"
      >
        <Box
          sx={[
            {
              position: "absolute",
              left: "50%",
              top: BEAD_CENTRE,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              cursor: "default",
            },
            mark === "none" && SIBLING_SX,
          ]}
          style={{ width: size, height: size, backgroundColor: colour, boxShadow: ring(mark, palette) }}
        />
      </HoverCardTooltip>
      {year && (
        <Typography
          variant="caption"
          sx={YEAR_SX}
          style={{ color: palette.muted }}
        >
          {year}
        </Typography>
      )}
    </Box>
  );
};

/** A sibling: present, and not the point. */
const SIBLING_SX = { opacity: 0.75 } as const;

/**
 * What a mark is to the card: the entry it is about; an entry of the same subject — another season
 * of the card's show — where there is context to stand apart from; the same where there is none,
 * and it is drawn plain; or context, drawn plain and stepped back.
 */
type Mark = "focus" | "subject" | "plain" | "none";

/**
 * The ring around a mark. Every mark gets a hairline in the strip's own line tone, so its shape is
 * legible whatever its fill lands on. The subject's is a solid ring of the ink, and the focus's a
 * gap of the ground and then the ink, so the two read as kin and the focus as the one of them — in
 * the ink rather than a colour because the ring means "this one" and nothing else. A subject with
 * no context is rung only at the focus: a ring on every season of a show that is alone on its
 * strip is a ring on everything, which marks nothing.
 */
const ring = (mark: Mark, palette: Palette) =>
  mark === "focus"
    ? `0 0 0 2px ${palette.ground}, 0 0 0 3.5px ${palette.onGround}`
    : mark === "subject"
      ? `0 0 0 2px ${palette.onGround}`
      : `0 0 0 1px ${palette.line}`;

const YEAR_SX = {
  position: "absolute",
  left: "50%",
  bottom: 0,
  transform: "translateX(-50%)",
  fontSize: 9,
  lineHeight: `${YEAR_HEIGHT}px`,
  fontVariantNumeric: "tabular-nums",
} as const;

/** A lane's pitch, the band inside it, and the dot a point is drawn as. */
const LANE_PITCH = 16;
const BAND_HEIGHT = 12;
const POINT = 8;
const FADED_ENDS = "linear-gradient(to right, transparent, #000 25%, #000 75%, transparent)";

/**
 * Every entry against time, on a window of the franchise's own years, with the fixed epoch–today
 * scale bracketed beneath so cards stay comparable.
 *
 * Lanes open only where entries genuinely overlap — a rewatch alongside a first watch, a game
 * played through a show's run — and never per medium: which medium a mark belongs to is its fill,
 * and a lane per medium would spend three rows on what one row and a legend say. Each lane is a
 * fixed pitch, so the strip grows to hold its lanes and no band shrinks to fit. A point — every
 * film — is a dot, since a bar floored to a percentage of the width is a different number of pixels
 * on every card.
 */
const WindowedStrip = ({
  entries,
  markOf,
  epoch,
  today,
}: {
  entries: FranchiseEntry[];
  markOf: (entry: FranchiseEntry) => Mark;
  epoch: YearMonthDay;
  today: YearMonthDay;
}) => {
  const palette = useArtworkPalette();
  const window = stripWindow(entries);
  const { bands, laneCount } = buildStrip(entries, window.from, window.to);
  const ticks = stripYearTicks(window.from, window.to);
  const every = yearLabelEvery(window.to.year - window.from.year + 1);

  // The fixed scale the context bar draws: the tab's epoch to today, opened wider only where the
  // window itself reaches past either end.
  const scaleFrom = window.from.lte(epoch) ? window.from : epoch;
  const scaleTo = today.lte(window.to) ? window.to : today;
  const scaleDays = scaleFrom.daysTo(scaleTo)!;
  const bracketLeft = percentAtDate(scaleFrom, window.from, scaleDays);
  const bracketWidth = percentOfSpan(window.from, window.to.lte(scaleTo) ? window.to : scaleTo, scaleDays);

  return (
    <Box>
      <Box sx={{ position: "relative", height: laneCount * LANE_PITCH }}>
        <TimelineScale ticks={ticks} />
        {bands.map((band) => (
          <StripMark
            key={band.key}
            band={band}
            mark={markOf(band)}
          />
        ))}
      </Box>
      <Box sx={{ position: "relative", height: YEAR_HEIGHT, marginTop: 0.5 }}>
        <Typography
          variant="caption"
          sx={[AXIS_SX, { left: 0, transform: "none" }]}
          style={{ color: palette.muted }}
        >
          {window.from.year}
        </Typography>
        {ticks
          .filter((tick) => (tick.year - window.from.year) % every === 0)
          .map((tick) => (
            <Typography
              key={tick.year}
              variant="caption"
              sx={AXIS_SX}
              style={{ left: `${tick.percent}%`, color: palette.muted }}
            >
              {shortYear(tick.year)}
            </Typography>
          ))}
      </Box>
      <Box
        sx={{ position: "relative", height: 4, marginTop: 1.25, borderRadius: 1 }}
        style={{ backgroundColor: palette.tile }}
      >
        <Box
          sx={{ position: "absolute", top: -2, height: 8, borderRadius: 1, opacity: 0.6 }}
          style={{ left: `${bracketLeft}%`, width: `${bracketWidth}%`, backgroundColor: palette.muted }}
        />
      </Box>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", marginTop: 0.25 }}
      >
        <Typography
          variant="caption"
          sx={SCALE_LABEL_SX}
          style={{ color: palette.muted }}
        >
          {scaleFrom.year}
        </Typography>
        <Typography
          variant="caption"
          sx={SCALE_LABEL_SX}
          style={{ color: palette.muted }}
        >
          today
        </Typography>
      </Stack>
    </Box>
  );
};

const AXIS_SX = {
  position: "absolute",
  transform: "translateX(-50%)",
  fontSize: 9,
  lineHeight: `${YEAR_HEIGHT}px`,
  fontVariantNumeric: "tabular-nums",
  userSelect: "none",
} as const;

const SCALE_LABEL_SX = {
  fontSize: 8,
  lineHeight: "10px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
} as const;

/**
 * One entry on the windowed strip: a band over its days, or a dot where it has none, with the
 * subject ringed.
 *
 * Geometry and fill go in `style`, since they differ per mark and a distinct value reaching `sx`
 * mints an emotion class of its own; what is left in `sx` is the handful of forms a mark takes.
 */
const StripMark = ({ band, mark }: { band: StripBand<FranchiseEntry>; mark: Mark }) => {
  const scheme = useScheme();
  const palette = useArtworkPalette();
  const colour = pick(band.fill, scheme);
  const point = band.start === band.end;
  const laneTop = band.lane * LANE_PITCH;
  const centre = band.startPercent + band.widthPercent / 2;
  const boxShadow = ring(mark, palette);

  return (
    <>
      <HoverCardTooltip
        colour={colour}
        title={<LazyTooltip render={band.hoverCard} />}
        placement="top"
      >
        {point ? (
          <Box
            sx={[
              MARK_SX,
              { width: POINT, height: POINT, borderRadius: "50%", transform: "translateX(-50%)" },
              mark === "none" && SIBLING_SX,
            ]}
            style={{ left: `${centre}%`, top: laneTop + (LANE_PITCH - POINT) / 2, backgroundColor: colour, boxShadow }}
          />
        ) : (
          <Box
            sx={[
              MARK_SX,
              { height: BAND_HEIGHT, borderRadius: 0.5 },
              mark === "none" && SIBLING_SX,
              !band.precise && IMPRECISE_SX,
            ]}
            style={{
              left: `${band.startPercent}%`,
              width: `${band.widthPercent}%`,
              top: laneTop + (LANE_PITCH - BAND_HEIGHT) / 2,
              backgroundColor: colour,
              boxShadow,
            }}
          />
        )}
      </HoverCardTooltip>
    </>
  );
};

const MARK_SX = { position: "absolute", cursor: "default" } as const;

/**
 * An estimated span dissolves at both ends rather than stopping at one, because a hard edge is a
 * date and this band does not have one. Square-cut too, so the rounded caps stay the mark of a
 * span the sheet actually pinned down.
 */
const IMPRECISE_SX = { maskImage: FADED_ENDS, WebkitMaskImage: FADED_ENDS, borderRadius: 0 } as const;
