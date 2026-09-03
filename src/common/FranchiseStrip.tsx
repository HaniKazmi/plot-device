import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography, type Theme } from "@mui/material";
import { useState, type ReactNode } from "react";
import { MEDIA, mediumToColour, mediumUnit, pick, type Scheme } from "../utils/types";
import { INLINE_SWATCH_SIZE, Swatch } from "./Card";
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
export type StripMode = "order" | "time";

/**
 * The mode a strip opens in: the one the reader last chose. A preference is about how the reader
 * likes to read a series rather than about one card, so it carries from card to card for the life
 * of the page and starts over on a reload, where it starts on the order.
 */
let preferredMode: StripMode = "order";

/**
 * A franchise on an expanded card or the hero: every entry the reader has met across the four
 * media, with the card's own item singled out.
 *
 * Drawn on the theme's paper inside whatever ground the card has — a tint of the artwork's own
 * colour, most often — because every fill the app declares is solved against the two papers and
 * against nothing else. Bands wear the medium's fill and nothing more: the platform, status or
 * genre a strip could colour by is already stated in the ledger below it, and a second vocabulary
 * on marks a few pixels wide is one nobody can read. The subject is set apart by a ring and a name,
 * not by colour, and only where there is context to stand apart from — a standalone show's own
 * seasons are all the subject, and ringing every one of them says nothing.
 */
export const FranchiseStrip = (props: {
  entries: FranchiseEntry[];
  /** The `subject` the card's own item answers; every entry answering it is the subject. */
  subject: string;
  franchise: string;
  /** Where the context bar's fixed scale opens: the tab's own epoch. */
  epoch: YearMonthDay;
  today: YearMonthDay;
  /** Fixes the mode and hides the switch, for a surface with no room for a control — the hero. */
  mode?: StripMode;
}) => {
  const { entries, subject, franchise, epoch, today } = props;
  const scheme = useScheme();
  const [chosen, setChosen] = useState<StripMode>(preferredMode);
  const mode = props.mode ?? chosen;

  const ordered = entries.sortByKey("start", true);
  const subjects = ordered.filter((entry) => entry.subject === subject);
  // Whether the subject has anything to stand apart from.
  const contextual = subjects.length < ordered.length;
  const window = stripWindow(ordered);
  const range =
    mode === "order"
      ? "in the order met"
      : `${window.from.year} – ${window.to.year >= today.year ? "today" : window.to.year}`;

  return (
    <Box
      sx={(theme: Theme) => ({
        backgroundColor: theme.vars.palette.background.paper,
        color: theme.vars.palette.text.primary,
        border: `1px solid ${theme.vars.palette.divider}`,
        borderRadius: 1,
        padding: 1,
      })}
    >
      <Caption
        franchise={franchise}
        entries={ordered}
        range={range}
        scheme={scheme}
        control={
          props.mode === undefined && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={mode}
              onChange={(_event, next: StripMode | null) => {
                if (!next) return;
                preferredMode = next;
                setChosen(next);
              }}
              aria-label="How the franchise is drawn"
            >
              <ToggleButton
                value="order"
                sx={SEGMENT_SX}
              >
                Order
              </ToggleButton>
              <ToggleButton
                value="time"
                sx={SEGMENT_SX}
              >
                Time
              </ToggleButton>
            </ToggleButtonGroup>
          )
        }
      />
      {mode === "order" ? (
        <BeadChain
          entries={ordered}
          subject={subject}
          contextual={contextual}
          scheme={scheme}
        />
      ) : (
        <WindowedStrip
          entries={ordered}
          subject={subject}
          contextual={contextual}
          epoch={epoch}
          today={today}
          scheme={scheme}
        />
      )}
    </Box>
  );
};

const SEGMENT_SX = { fontSize: 11, paddingY: 0.25, paddingX: 1, textTransform: "none", lineHeight: 1.4 } as const;

/**
 * The strip's own legend: the franchise, then every medium it holds counted in its own unit and
 * wearing its fill — which is what makes an unlabelled bead readable — then which of the two
 * readings the marks below give.
 */
const Caption = ({
  franchise,
  entries,
  range,
  scheme,
  control,
}: {
  franchise: string;
  entries: FranchiseEntry[];
  range: string;
  scheme: Scheme;
  control: ReactNode;
}) => (
  <Stack
    direction="row"
    spacing={1}
    sx={{ alignItems: "center", flexWrap: "wrap", marginBottom: 0.5 }}
  >
    <Typography
      variant="caption"
      noWrap
      sx={{ fontWeight: 700 }}
    >
      {franchise}
    </Typography>
    {MEDIA.map((medium) => {
      const count = entries.filter((entry) => entry.medium === medium).length;
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
    <Typography
      variant="caption"
      sx={{ color: "text.secondary" }}
    >
      {range}
    </Typography>
    <Box sx={{ flex: 1 }} />
    {control}
  </Stack>
);

/** A bead, and the one the card is about. */
const BEAD = 12;
const SUBJECT_BEAD = 16;
/** The least a bead and the gap after it take, which is what decides when the chain wraps. */
const MIN_PITCH = 28;
/** Rows of the chain: a name above, the bead and its line, a year beneath. */
const LABEL_HEIGHT = 14;
const BEAD_ROW = 18;
const YEAR_HEIGHT = 12;
const ROW_HEIGHT = LABEL_HEIGHT + BEAD_ROW + YEAR_HEIGHT;
const BEAD_CENTRE = LABEL_HEIGHT + BEAD_ROW / 2;
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
  subject,
  contextual,
  scheme,
}: {
  entries: FranchiseEntry[];
  subject: string;
  contextual: boolean;
  scheme: Scheme;
}) => {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const perRow = beadsPerRow(entries.length, width ?? UNMEASURED_WIDTH, MIN_PITCH);
  const rows: FranchiseEntry[][] = [];
  for (let start = 0; start < entries.length; start += perRow) rows.push(entries.slice(start, start + perRow));
  // The name goes on the latest of the subject's entries: a show's seasons are all the subject,
  // and one name on the last of them says which show without saying it five times.
  const named = contextual ? entries.findLast((entry) => entry.subject === subject) : undefined;

  return (
    <Box ref={ref}>
      {rows.map((row, rowIndex) => (
        <Box
          key={rowIndex}
          sx={{ display: "flex" }}
        >
          {row.map((entry, column) => {
            const index = rowIndex * perRow + column;
            const yearShown = index === 0 || entries[index - 1].start.year !== entry.start.year;
            return (
              <Bead
                key={entry.key}
                entry={entry}
                subject={contextual && entry.subject === subject}
                label={entry === named ? entry.label : undefined}
                labelSide={column < row.length / 2 ? "right" : "left"}
                lineLeft={column > 0}
                lineRight={column < row.length - 1}
                year={yearShown ? shortYear(entry.start.year) : undefined}
                widthPercent={100 / perRow}
                scheme={scheme}
              />
            );
          })}
        </Box>
      ))}
    </Box>
  );
};

const LINE_SX = { position: "absolute", top: BEAD_CENTRE - 1, height: 2, backgroundColor: "divider" } as const;

const Bead = ({
  entry,
  subject,
  label,
  labelSide,
  lineLeft,
  lineRight,
  year,
  widthPercent,
  scheme,
}: {
  entry: FranchiseEntry;
  subject: boolean;
  label?: string;
  labelSide: "left" | "right";
  lineLeft: boolean;
  lineRight: boolean;
  year?: string;
  widthPercent: number;
  scheme: Scheme;
}) => {
  const colour = pick(entry.fill, scheme);
  const size = subject ? SUBJECT_BEAD : BEAD;

  return (
    <Box
      sx={{ position: "relative", height: ROW_HEIGHT }}
      style={{ flex: `0 0 ${widthPercent}%` }}
    >
      {lineLeft && <Box sx={{ ...LINE_SX, left: 0, width: "50%" }} />}
      {lineRight && <Box sx={{ ...LINE_SX, right: 0, width: "50%" }} />}
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
            subject ? RING_SX : SIBLING_SX,
          ]}
          style={{ width: size, height: size, backgroundColor: colour }}
        />
      </HoverCardTooltip>
      {label && (
        <Typography
          variant="caption"
          sx={[
            NAME_SX,
            labelSide === "right"
              ? { left: "50%", marginLeft: `${-size / 2}px` }
              : { right: "50%", marginRight: `${-size / 2}px` },
          ]}
        >
          {label}
        </Typography>
      )}
      {year && (
        <Typography
          variant="caption"
          sx={YEAR_SX}
        >
          {year}
        </Typography>
      )}
    </Box>
  );
};

/** A sibling: present, and not the point. */
const SIBLING_SX = { opacity: 0.7 } as const;

/**
 * The subject's ring: a gap of the paper and then the ink, so it reads against the mark's own
 * fill and against the paper alike. In the ink rather than a colour because the ring means "this
 * one" and nothing else.
 */
const RING_SX = {
  boxShadow: (theme: Theme) =>
    `0 0 0 2px ${theme.vars.palette.background.paper}, 0 0 0 3.5px ${theme.vars.palette.text.primary}`,
} as const;

const NAME_SX = {
  position: "absolute",
  top: 0,
  fontSize: 10,
  fontWeight: 650,
  lineHeight: `${LABEL_HEIGHT}px`,
  whiteSpace: "nowrap",
} as const;

const YEAR_SX = {
  position: "absolute",
  left: "50%",
  bottom: 0,
  transform: "translateX(-50%)",
  fontSize: 9,
  lineHeight: `${YEAR_HEIGHT}px`,
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
} as const;

/** A lane's pitch, the band inside it, and the dot a point is drawn as. */
const LANE_PITCH = 16;
const BAND_HEIGHT = 12;
const POINT = 8;
/** How far along the window a subject's name is put on its right rather than its left. */
const NAME_FLIPS_AT = 60;
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
  subject,
  contextual,
  epoch,
  today,
  scheme,
}: {
  entries: FranchiseEntry[];
  subject: string;
  contextual: boolean;
  epoch: YearMonthDay;
  today: YearMonthDay;
  scheme: Scheme;
}) => {
  const window = stripWindow(entries);
  const { bands, laneCount } = buildStrip(entries, window.from, window.to);
  const ticks = stripYearTicks(window.from, window.to);
  const every = yearLabelEvery(window.to.year - window.from.year + 1);
  const named = contextual ? bands.findLast((band) => band.subject === subject) : undefined;

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
        {ticks.map((tick) => (
          <Box
            key={tick.year}
            sx={HAIRLINE_SX}
            style={{ left: `${tick.percent}%` }}
          />
        ))}
        {bands.map((band) => (
          <StripMark
            key={band.key}
            band={band}
            subject={contextual && band.subject === subject}
            label={band === named ? band.label : undefined}
            scheme={scheme}
          />
        ))}
      </Box>
      <Box sx={{ position: "relative", height: YEAR_HEIGHT, marginTop: 0.5 }}>
        <Typography
          variant="caption"
          sx={[AXIS_SX, { left: 0, transform: "none" }]}
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
              style={{ left: `${tick.percent}%` }}
            >
              {shortYear(tick.year)}
            </Typography>
          ))}
      </Box>
      <Box sx={{ position: "relative", height: 4, marginTop: 1.25, borderRadius: 1, backgroundColor: "action.hover" }}>
        <Box
          sx={{
            position: "absolute",
            top: -2,
            height: 8,
            borderRadius: 1,
            backgroundColor: "text.secondary",
            opacity: 0.6,
          }}
          style={{ left: `${bracketLeft}%`, width: `${bracketWidth}%` }}
        />
      </Box>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", marginTop: 0.25 }}
      >
        <Typography
          variant="caption"
          sx={SCALE_LABEL_SX}
        >
          {scaleFrom.year}
        </Typography>
        <Typography
          variant="caption"
          sx={SCALE_LABEL_SX}
        >
          today
        </Typography>
      </Stack>
    </Box>
  );
};

const HAIRLINE_SX = { position: "absolute", top: 0, bottom: 0, width: "1px", backgroundColor: "divider" } as const;

const AXIS_SX = {
  position: "absolute",
  transform: "translateX(-50%)",
  fontSize: 9,
  lineHeight: `${YEAR_HEIGHT}px`,
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
  userSelect: "none",
} as const;

const SCALE_LABEL_SX = {
  fontSize: 8,
  lineHeight: "10px",
  color: "text.secondary",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
} as const;

/**
 * One entry on the windowed strip: a band over its days, or a dot where it has none, with the
 * subject ringed and named.
 *
 * Geometry and fill go in `style`, since they differ per mark and a distinct value reaching `sx`
 * mints an emotion class of its own; what is left in `sx` is the handful of forms a mark takes.
 */
const StripMark = ({
  band,
  subject,
  label,
  scheme,
}: {
  band: StripBand<FranchiseEntry>;
  subject: boolean;
  label?: string;
  scheme: Scheme;
}) => {
  const colour = pick(band.fill, scheme);
  const point = band.start === band.end;
  const laneTop = band.lane * LANE_PITCH;
  const centre = band.startPercent + band.widthPercent / 2;
  // Named on the side with the room: past the flip the name would run off the right edge.
  const nameOnRight = band.startPercent < NAME_FLIPS_AT;

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
              subject ? RING_SX : SIBLING_SX,
            ]}
            style={{ left: `${centre}%`, top: laneTop + (LANE_PITCH - POINT) / 2, backgroundColor: colour }}
          />
        ) : (
          <Box
            sx={[
              MARK_SX,
              { height: BAND_HEIGHT, borderRadius: 0.5 },
              subject ? RING_SX : SIBLING_SX,
              !band.precise && IMPRECISE_SX,
            ]}
            style={{
              left: `${band.startPercent}%`,
              width: `${band.widthPercent}%`,
              top: laneTop + (LANE_PITCH - BAND_HEIGHT) / 2,
              backgroundColor: colour,
            }}
          />
        )}
      </HoverCardTooltip>
      {label && (
        <Typography
          variant="caption"
          sx={[NAME_SX, { lineHeight: `${LANE_PITCH}px` }]}
          style={
            nameOnRight
              ? { top: laneTop, left: `calc(${point ? centre : band.startPercent + band.widthPercent}% + 8px)` }
              : { top: laneTop, right: `calc(${100 - (point ? centre : band.startPercent)}% + 8px)` }
          }
        >
          {label}
        </Typography>
      )}
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
