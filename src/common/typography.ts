/**
 * A line of type set as a label rather than as prose — a stat tile's caption, a hero's kicker,
 * the heading over a vitals band. Uppercase at caption size sets too tight to read as words
 * without the extra tracking.
 *
 * One constant rather than the pair written out at each of them, so the labels across the app
 * cannot drift into being three slightly different treatments.
 */
export const LABEL_SX = { letterSpacing: "0.08em", textTransform: "uppercase" } as const;

/**
 * A small label whose content is mostly figures — a rail chip's year, the pill standing in for one.
 *
 * Tabular figures because proportional digits change the label's width with the numerals in it, so
 * a row of them shifts sideways as the highlight moves through it and a fixed pill twitches as it
 * counts. One constant because the two are the same label in two presentations, and a size that
 * differed between them would read as a different thing rather than the same one relocating.
 */
export const NUMERIC_LABEL_SX = { fontSize: 12, fontVariantNumeric: "tabular-nums" } as const;

/**
 * A figure set beside the thing it counts rather than as the point of its own line: a section
 * header's population, a shelf's card count, a bar's hours.
 *
 * Toned down because it is context and not the answer, and tabular because proportional digits
 * change a figure's width with the numerals in it — a column of them shifts sideways as the data
 * refreshes under a filter, and a header's count twitches as it counts.
 */
export const MUTED_FIGURE_SX = { color: "text.secondary", fontVariantNumeric: "tabular-nums" } as const;

/**
 * How far a mark fades when the pointer is on one of its peers, and how quickly.
 *
 * One value because the dim is one behaviour reaching across two elements: a proportional bar and
 * the legend beside it fade in step, and a segment that dimmed to a different depth than its own
 * legend row would read as two things responding to one hover rather than as one thing answering.
 */
export const dimSx = (hovered: string | null, name: string) => ({
  opacity: hovered && hovered !== name ? 0.3 : 1,
  transition: "opacity 0.2s",
});

/**
 * The type every part of the control kit is set in: 12px, and worded rather than shouted.
 *
 * One size across the kit because a control stands in a card header beside a title and in the
 * section rail beside the chips, and a segment that read at one size in the header and another
 * in the rail would be two controls rather than one relocating. `textTransform: none` because
 * the labels arrive worded — "Start date", not "Start Date".
 *
 * `Google.tsx` states it on each part; here because the sizes below are read as numbers too, and
 * a control's type and its height are one decision.
 */
export const CONTROL_TYPE_SX = { fontSize: 12, textTransform: "none" } as const;

/**
 * How tall a control stands in a card header, in pixels. Tall enough that a 12px word has room
 * either side of it and short enough to sit under a heading without becoming the heading.
 */
export const CONTROL_HEIGHT = 28;

/**
 * How tall a chip stands in the rail. Four pixels under a header's control, which is what puts a
 * pill's word level with a segment's beside it — the rail carries both.
 */
export const RAIL_CHIP_HEIGHT = 24;

/**
 * Every part of the kit under a coarse pointer. The type stays where it is and only the target
 * grows: a control that changed size with the pointer would read as a different control, where a
 * thumb only needs somewhere to land. One height for the whole kit, so the rail's row — chips,
 * the measure, the scope — is level.
 */
export const COARSE_CONTROL_HEIGHT = 32;

/**
 * A control's corner. Rectangles change how something is drawn and pills take the reader
 * somewhere, so a control is rounded only enough to read as a soft rectangle; a chip is a pill
 * at half its own height and keeps the distinction the eye reads the rail by.
 */
export const CONTROL_RADIUS = 6;
