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
 * A segment's own type. 12px because the control sits in a card header beside a title and in the
 * section rail beside 22px chips, and the button's own size would stand taller than either;
 * `textTransform: none` because the labels arrive worded — "Start date", not "Start Date".
 *
 * Here rather than beside the control, whose file exports components alone: a button that is not
 * a segment has to read as one — the fold's disclosure,
 * which stands among these controls and would otherwise be the one call to action on the page.
 * The type alone: a button outside a group is sized by what it stands next to rather than by the
 * finger reaching for a row of them.
 */
export const SEGMENT_TYPE_SX = {
  fontSize: 12,
  textTransform: "none",
  paddingY: 0.5,
  paddingX: 1.25,
} as const;
