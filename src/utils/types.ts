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
 * **The contract every chart fill in this app is held to**, stated here once and referred to from
 * each of the tables that has to meet it.
 *
 * A fill is drawn on both of the surfaces the app paints on — #ffffff paper in the light scheme,
 * #1d2126 paper in the dark one — and so clears 3:1 against both. A colour chosen against the
 * light card alone washes out on the dark one: `#ffeb3b` is 1.22:1 on white. Meeting the floor on
 * both ends means only lightness is free to move, which is what keeps every table in this app
 * inside one lightness band.
 *
 * The relief, where a value's own identity *is* its brightness or its darkness, is to relax the
 * floor to 2.2:1 on the offending surface alone and keep the full 3:1 on the other. That is only
 * allowed where colour is not carrying the meaning by itself — a labelled wedge, a named legend
 * entry — and the table taking it says which entries do and why. `vg/types.ts`'s franchise brands
 * are the one set that does.
 *
 * `NEUTRAL_FILL` itself is the colour of absence: a state that has not started, a category with no
 * colour of its own, the "Other" bucket a top-N list collects the tail into. One value across all
 * three, so a reader who has learnt that this grey means "nothing to say here" reads it the same
 * on every chart. Black beside coloured fills reads as another hue rather than as absence.
 */
export const NEUTRAL_FILL = "#7d828c" as Colour;

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
 * Every value meets the fill contract above.
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
      return NEUTRAL_FILL;
  }
};
