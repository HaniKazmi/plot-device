import { Box, Stack, Typography } from "@mui/material";
import { useState, type ReactNode } from "react";
import { MEDIA, mediumToColour, mediumUnit, pick, type Scheme } from "../utils/types";
import { useArtworkPalette } from "./artworkPalette";
import { INLINE_SWATCH_SIZE, Swatch } from "./Card";
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
export type StripMode = "order" | "time";

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

/** The tones a strip is drawn in, resolved once from the card it stands in. */
interface StripColours {
  ground: string;
  ink: string;
  muted: string;
  line: string;
  wash: string;
}

/**
 * A franchise on an expanded card or the hero: every entry the reader has met across the four
 * media, with the card's own item singled out.
 *
 * Marks wear the medium's fill and nothing more: the platform, status or genre a strip could
 * colour by is already stated in the ledger below it, and a second vocabulary on marks a few
 * pixels wide is one nobody can read. The subject is set apart by a ring and a name, not by
 * colour, and only where there is context to stand apart from — a standalone show's own seasons
 * are all the subject, and ringing every one of them says nothing.
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
  franchise: string;
  /** Where the context bar's fixed scale opens: the tab's own epoch. */
  epoch: YearMonthDay;
  today: YearMonthDay;
  /** Fixes the mode and hides the switch, for a surface with no room for a control — the hero. */
  mode?: StripMode;
}) => {
  const { entries, subject, franchise, epoch, today } = props;
  const scheme = useScheme();
  const palette = useArtworkPalette();
  const [chosen, setChosen] = useState<StripMode>(preferredMode);
  const mode = props.mode ?? chosen;
  const colours: StripColours = {
    ground: palette.ground,
    ink: palette.onGround,
    muted: palette.muted,
    line: palette.line,
    wash: palette.tile,
  };

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
      sx={{ borderRadius: 1, padding: 1 }}
      style={{ color: colours.ink, backgroundColor: colours.wash, border: `1px solid ${colours.line}` }}
    >
      <Caption
        franchise={franchise}
        entries={ordered}
        range={range}
        scheme={scheme}
        colours={colours}
        control={
          props.mode === undefined && (
            <SegmentedControl
              options={STRIP_MODES}
              value={mode}
              tone={colours}
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
          subject={subject}
          contextual={contextual}
          scheme={scheme}
          colours={colours}
        />
      ) : (
        <WindowedStrip
          entries={ordered}
          subject={subject}
          contextual={contextual}
          epoch={epoch}
          today={today}
          scheme={scheme}
          colours={colours}
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
  scheme,
  colours,
  control,
}: {
  franchise: string;
  entries: FranchiseEntry[];
  range: string;
  scheme: Scheme;
  colours: StripColours;
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
      style={{ color: colours.muted }}
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
  colours,
}: {
  entries: FranchiseEntry[];
  subject: string;
  contextual: boolean;
  scheme: Scheme;
  colours: StripColours;
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
                colours={colours}
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
  subject,
  label,
  labelSide,
  lineLeft,
  lineRight,
  year,
  widthPercent,
  scheme,
  colours,
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
  colours: StripColours;
}) => {
  const colour = pick(entry.fill, scheme);
  const size = subject ? SUBJECT_BEAD : BEAD;

  return (
    <Box
      sx={{ position: "relative", height: ROW_HEIGHT }}
      style={{ flex: `0 0 ${widthPercent}%` }}
    >
      {lineLeft && (
        <Box
          sx={{ ...LINE_SX, left: 0, width: "50%" }}
          style={{ backgroundColor: colours.line }}
        />
      )}
      {lineRight && (
        <Box
          sx={{ ...LINE_SX, right: 0, width: "50%" }}
          style={{ backgroundColor: colours.line }}
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
            !subject && SIBLING_SX,
          ]}
          style={{ width: size, height: size, backgroundColor: colour, boxShadow: ring(subject, colours) }}
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
          style={{ color: colours.muted }}
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
 * The ring around a mark. Every mark gets a hairline in the strip's own line tone, so its shape is
 * legible whatever its fill lands on; the subject's is a gap of the ground and then the ink, so it
 * reads against the mark's own fill and against the ground alike — in the ink rather than a colour
 * because the ring means "this one" and nothing else.
 */
const ring = (subject: boolean, colours: StripColours) =>
  subject ? `0 0 0 2px ${colours.ground}, 0 0 0 3.5px ${colours.ink}` : `0 0 0 1px ${colours.line}`;

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
  colours,
}: {
  entries: FranchiseEntry[];
  subject: string;
  contextual: boolean;
  epoch: YearMonthDay;
  today: YearMonthDay;
  scheme: Scheme;
  colours: StripColours;
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
            style={{ left: `${tick.percent}%`, backgroundColor: colours.line }}
          />
        ))}
        {bands.map((band) => (
          <StripMark
            key={band.key}
            band={band}
            subject={contextual && band.subject === subject}
            label={band === named ? band.label : undefined}
            scheme={scheme}
            colours={colours}
          />
        ))}
      </Box>
      <Box sx={{ position: "relative", height: YEAR_HEIGHT, marginTop: 0.5 }}>
        <Typography
          variant="caption"
          sx={[AXIS_SX, { left: 0, transform: "none" }]}
          style={{ color: colours.muted }}
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
              style={{ left: `${tick.percent}%`, color: colours.muted }}
            >
              {shortYear(tick.year)}
            </Typography>
          ))}
      </Box>
      <Box
        sx={{ position: "relative", height: 4, marginTop: 1.25, borderRadius: 1 }}
        style={{ backgroundColor: colours.wash }}
      >
        <Box
          sx={{ position: "absolute", top: -2, height: 8, borderRadius: 1, opacity: 0.6 }}
          style={{ left: `${bracketLeft}%`, width: `${bracketWidth}%`, backgroundColor: colours.muted }}
        />
      </Box>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", marginTop: 0.25 }}
      >
        <Typography
          variant="caption"
          sx={SCALE_LABEL_SX}
          style={{ color: colours.muted }}
        >
          {scaleFrom.year}
        </Typography>
        <Typography
          variant="caption"
          sx={SCALE_LABEL_SX}
          style={{ color: colours.muted }}
        >
          today
        </Typography>
      </Stack>
    </Box>
  );
};

const HAIRLINE_SX = { position: "absolute", top: 0, bottom: 0, width: "1px" } as const;

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
  colours,
}: {
  band: StripBand<FranchiseEntry>;
  subject: boolean;
  label?: string;
  scheme: Scheme;
  colours: StripColours;
}) => {
  const colour = pick(band.fill, scheme);
  const point = band.start === band.end;
  const laneTop = band.lane * LANE_PITCH;
  const centre = band.startPercent + band.widthPercent / 2;
  // Named on the side with the room: past the flip the name would run off the right edge.
  const nameOnRight = band.startPercent < NAME_FLIPS_AT;
  const boxShadow = ring(subject, colours);

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
              !subject && SIBLING_SX,
            ]}
            style={{ left: `${centre}%`, top: laneTop + (LANE_PITCH - POINT) / 2, backgroundColor: colour, boxShadow }}
          />
        ) : (
          <Box
            sx={[
              MARK_SX,
              { height: BAND_HEIGHT, borderRadius: 0.5 },
              !subject && SIBLING_SX,
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
      {label && (
        <Typography
          variant="caption"
          sx={[NAME_SX, HALO_SX, { lineHeight: `${LANE_PITCH}px` }]}
          style={{
            top: laneTop,
            // The well's own surface: the wash over the ground, so the halo does not read as a
            // hole cut in the well. Two properties rather than one shorthand, because a colour
            // written as its own comma-separated layer is not a background image and is dropped.
            backgroundColor: colours.ground,
            backgroundImage: `linear-gradient(${colours.wash}, ${colours.wash})`,
            ...(nameOnRight
              ? { left: `calc(${point ? centre : band.startPercent + band.widthPercent}% + 8px)` }
              : { right: `calc(${100 - (point ? centre : band.startPercent)}% + 8px)` }),
          }}
        >
          {label}
        </Typography>
      )}
    </>
  );
};

const MARK_SX = { position: "absolute", cursor: "default" } as const;

/**
 * The ground behind a name that sits among bands: on a window a dozen years wide the subject's
 * name is longer than the gap beside it, and type over a band is type over a fill it was never
 * checked against.
 */
const HALO_SX = { paddingX: 0.5, borderRadius: 0.5, zIndex: 2 } as const;

/**
 * An estimated span dissolves at both ends rather than stopping at one, because a hard edge is a
 * date and this band does not have one. Square-cut too, so the rounded caps stay the mark of a
 * span the sheet actually pinned down.
 */
const IMPRECISE_SX = { maskImage: FADED_ENDS, WebkitMaskImage: FADED_ENDS, borderRadius: 0 } as const;
