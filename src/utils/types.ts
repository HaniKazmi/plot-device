export type KeysMatching<T, V> = keyof { [P in keyof T as T[P] extends V ? P : never]: P };
export type Predicate<T> = (input: T) => boolean;

export type Distinct<T, DistinctName> = T & { __TYPE__: DistinctName };

export type Colour = Distinct<string, "Colour">;

/**
 * The status vocabulary this shared layer knows how to colour. Each domain declares its own
 * `Status` union, which stays assignable to this — the dependency deliberately does not run
 * the other way, so utils/ never imports from a domain folder.
 */
export type ColourableStatus =
  "Abandoned" | "Beat" | "Ended" | "Cancelled" | "Endless" | "Up To Date" | "Playing" | "Watching" | "Next" | "Backlog";

/**
 * Hue says how a thing ended; lightness says whether it is still moving.
 *
 * Cyan is in progress, blue is open-ended, green finished well, amber was stopped by someone
 * else, rose was stopped by choice — and the five step down in lightness in that order, so a
 * chart squinted at answers "how much of this is still alive?" before a single hue is read.
 * Active states are the lightest and most vivid; the finished green sits a chroma step below the
 * other terminal states, because it is the majority of every status chart and a majority at full
 * saturation is a wall, while Cancelled and Abandoned are the exceptions worth noticing.
 *
 * Next and Backlog have not started, so they take the same neutral grey the charts' "Other"
 * buckets wear: an inert state wants an inert colour, and black beside coloured fills reads as a
 * sixth hue rather than as absence.
 *
 * Every value clears 3:1 against both surfaces the app paints on (#ffffff and #1d2126 paper).
 */
export const statusToColour = ({ status }: { status: ColourableStatus }) => {
  switch (status) {
    case "Abandoned":
      return "#d10074" as Colour;
    case "Beat":
    case "Ended":
      return "#338c5f" as Colour;
    case "Cancelled":
      return "#9b6200" as Colour;
    case "Endless":
    case "Up To Date":
      return "#2f75ff" as Colour;
    case "Playing":
    case "Watching":
      return "#00a5a6" as Colour;
    case "Next":
    case "Backlog":
      return "#7d828c" as Colour;
  }
};
