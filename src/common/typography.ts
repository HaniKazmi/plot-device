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
