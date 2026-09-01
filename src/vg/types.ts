import type { Year, YearMonthDay } from "../common/date";
import {
  NEUTRAL_FILL,
  ageRatingToColour,
  decadeToColour,
  fill,
  franchiseToColour,
  genreToColour,
  pick,
  releaseDecade,
  statusToColour,
  type AgeRating,
  type Colour,
  type Fill,
  type KeysMatching,
  type Scheme,
} from "../utils/types";

export interface VideoGame {
  name: string;
  platform: Platform;
  company: Company;
  developer: string;
  publisher: string;
  franchise: string;
  /**
   * What the game is *about*, in the vocabulary Shows and Movies record — which is what lets a
   * game meet a film under one genre name on the Omnibus. Open rather than a union, matching
   * `Show.genre` and `Movie.genre`: the column is open-ended and the shared ramp answers
   * `NEUTRAL_FILL` off its table.
   *
   * Always answerable: the converter rejects an empty cell where it still knows the row, so no
   * game reaches a chart carrying a genre nobody recorded.
   */
  genre: string;
  /** How it is *played*, which is a games-only distinction and so keeps a closed union. */
  gameplay: Gameplay;
  theme: string[];
  rating: AgeRating;
  /**
   * Either precision, because the sheet holds both: a release is often recorded as a bare year,
   * and `PlainDate.from` answers a `Year` for one. Narrowing this to `YearMonthDay` states
   * something the converter does not produce, and a reader who believes it reaches for `daysTo`
   * against a full date — which throws where the two share a year, since the longer string
   * compares greater and the ordering guard reads that as a transposition.
   */
  releaseDate: YearMonthDay | Year;
  format: Format;
  status: Status;
  party?: boolean;
  hours?: number;
  numDays?: number;
  banner?: string;
  startDate: YearMonthDay | Year;
  endDate?: YearMonthDay | Year;
}

export type VideoGameStringKeys = KeysMatching<VideoGame, string>;

export const videoGameOptions: readonly VideoGameStringKeys[] = [
  "gameplay",
  "genre",
  "company",
  "platform",
  "status",
  "format",
  "rating",
  "developer",
  "publisher",
  "franchise",
  "name",
];

export type Format = "Physical" | "Digital" | "Pirated" | "Subscription";
export type Status = "Playing" | "Endless" | "Abandoned" | "Beat" | "Backlog" | "Next";
export type Company = "PlayStation" | "Nintendo" | "PC" | "iOS" | "Xbox";
export type Platform = `${Company}${string}`;
/**
 * Listed rather than written as a bare union so the converter can check a cell against it while it
 * still knows which row it came from. `gameplayColours` is keyed on the union, so a value added
 * here is a compile error until it has a fill.
 */
export const GAMEPLAY = [
  "Action",
  "Adventure",
  "Action Adventure",
  "Driving/Racing",
  "Fighting",
  "Party Games",
  "Platformer",
  "Puzzle",
  "Role Playing",
  "Shooter",
  "Simulation",
  "Strategy",
  "Visual Novel",
  "Music/Rhythm",
] as const;

export type Gameplay = (typeof GAMEPLAY)[number];

/**
 * Whether a sheet cell holds a gameplay style, so the converter can reject a blank or misspelt one
 * where it still knows the row. Without it the cell is cast unchecked and the first sign of trouble
 * is a wedge quietly wearing the neutral, which reads as a style with no colour yet rather than as
 * a cell nobody filled in.
 */
export const isGameplay = (value: string): value is Gameplay => (GAMEPLAY as readonly string[]).includes(value);

export type Measure = "Hours" | "Games";

/**
 * A company has two colours, and which one is right depends on how much of the screen it covers.
 *
 * The fills below are the ones chart geometry uses — sunburst wedges, barchart series, timeline
 * bars, stacked segments, card strips. Each keeps its brand's hue and meets the fill contract on
 * `NEUTRAL_FILL`, half by half.
 *
 * PC is the one entry with no brand to reproduce — it is a category, not a company — so it takes
 * the amber of the beige box rather than a vendor's hex. Steam is the obvious anchor and the wrong
 * one: its whole palette is a cool blue-grey family sitting on PlayStation's own hue, and two blues
 * separated only by lightness and chroma read as one blue however far apart they measure.
 *
 * Putting PC in the warm arc is what lets the other two entries be themselves. PlayStation keeps
 * its published #006FCD on both papers, and iOS takes Apple's own space grey and silver — a warm
 * cast on it would buy nothing, PC having left the cool region to it. With that region holding
 * only iOS and the neutral, a lightness gap separates them. That gap is the weakest link in the
 * table at
 * 11.8, which is under the 15 two fills want: the wedge labels and legend names stay load-bearing
 * for that pair, and they meet only in the Top Platform list where every row is named.
 *
 * The accents are the brand hexes themselves, for the chip in a card's corner. A chip is a few
 * dozen pixels of solid colour carrying two or three letters, so it is read as a badge rather than
 * compared against its neighbours — full saturation is what makes it recognisable at that size,
 * and there is no adjacent wedge for it to have to separate from.
 */
const companyColours: Record<Company, { fill: Fill; accent: Colour }> = {
  Nintendo: { fill: fill("#e60012", "#e60012"), accent: "#E60012" as Colour },
  PlayStation: { fill: fill("#006fcd", "#0270ce"), accent: "#006FCD" as Colour },
  Xbox: { fill: fill("#107c10", "#21871f"), accent: "#107C10" as Colour },
  PC: { fill: fill("#c08600", "#ffb411"), accent: "#c9a227" as Colour },
  iOS: { fill: fill("#4a5360", "#b0b8c3"), accent: "#8e8e93" as Colour },
};

/** Every company the table colours, so the fill-contract test cannot fall behind it. */
export const COMPANIES = Object.keys(companyColours) as Company[];

/**
 * The chart fill. `undefined` for a company outside the table, which is what lets `platformToColor`
 * turn a platform string whose first word is not a bare company name into a loud error rather than
 * an uncoloured bar.
 */
export const companyToColor = ({ company }: { company: Company }, scheme: Scheme): Colour => {
  const colour = companyColours[company]?.fill;
  return colour && pick(colour, scheme);
};

/** The brand hex, drawn only in a card's corner chip. `undefined` outside the table, as above. */
export const companyToAccent = ({ company }: { company: Company }): Colour => companyColours[company]?.accent;

/**
 * Every platform the app understands, and the short name charts label it with.
 *
 * This is also the set `platformToColor` validates against, so a console added here is
 * understood everywhere at once.
 */
const platformShortNames: Record<Platform, string> = {
  "PlayStation 2": "PS2",
  "PlayStation 3": "PS3",
  "PlayStation P": "PSP",
  "PlayStation 4": "PS4",
  "PlayStation 5": "PS5",
  "Nintendo Wii": "Wii",
  "Nintendo GBC": "GBC",
  "Nintendo GBA": "GBA",
  "Nintendo DS": "DS",
  "Nintendo 3DS": "3DS",
  "Nintendo Switch": "NSW",
  "Nintendo Switch 2": "NSW2",
  PC: "PC",
  iOS: "iOS",
  "Xbox 360": "360",
};

/**
 * A platform's colour is its company's, which is the first word of the platform string — the
 * same split `converter.ts` derives `company` with.
 *
 * Throws unless the platform is known *and* that first word is a company with a colour.
 * `companyToColor` answers `undefined` off its table, so a platform whose first word is not a bare
 * company name would otherwise render as an uncoloured bar.
 */
export const platformToColor = (platform: Platform | { platform: Platform }, scheme: Scheme) => {
  const value = typeof platform === "object" ? platform.platform : platform;
  const colour = platformShortNames[value] && companyToColor({ company: value.split(" ")[0] as Company }, scheme);
  if (!colour) throw new Error("Unknown platform: " + value);
  return colour;
};

/**
 * The corner chip: a short console name and the company's accent, which is the one place the
 * brand hex is drawn rather than the chart fill.
 */
export const platformToShort: (vg: VideoGame) => [string, Colour] = (vg) => {
  const short = platformShortNames[vg.platform];
  if (!short) throw new Error("Unknown platform: " + vg.platform);
  return [short, companyToAccent(vg)];
};

export const ratingToColour = ({ rating }: VideoGame, scheme: Scheme) => ageRatingToColour(rating, scheme);

/**
 * A gameplay style has no brand to reproduce, so each colour is chosen to *represent* it: flame for
 * Action, exploration green for Adventure, the leather-bronze between them for Action Adventure,
 * a dashboard amber for Driving/Racing, military olive for Shooter, crimson for Fighting, party
 * magenta, sakura pink for Visual Novel, sky blue for Platformer, steel blue for Strategy, indigo
 * for Role Playing, violet for Puzzle, a blueprint teal for Simulation and cyan for Music/Rhythm.
 * Action takes the flame end of red rather than a pillar-box red because sRGB has no bright red:
 * red only exists low in the lightness range, and Fighting's crimson is what occupies it.
 *
 * Every value meets the fill contract on `NEUTRAL_FILL`, with chroma taken as high as sRGB allows
 * at its lightness. Fourteen hues is more than hue alone can separate — 27° apart is roughly dE 7,
 * and telling two fills apart wants 15 — so lightness alternates around the hue wheel and
 * neighbours land at opposite ends of the band.
 *
 * Strategy is the one deliberately deep member of the blues. A red-blind reader sees violet as
 * blue, so a light steel blue beside Puzzle's light violet is ΔE 1 to them however far apart the
 * hues are; only lightness separates that pair, and the two are adjacent on the Top Gameplay bar.
 * Platformer's sky blue is then the light half of the same hue, which is what those two names
 * mean anyway.
 *
 * Action and Adventure are the same hex as their genre namesakes, deliberately: those names mean
 * the same thing whichever vocabulary says them. The rest are pushed as far from the genre ramp as
 * one lightness band holds, which is not always far. Fourteen gameplay hues and eleven genre hues
 * are twenty-five values that would each need 15 dE of room, and the band has nowhere near that —
 * so Role Playing sits 2.3 from Thriller on the dark paper, where the only lightness that would
 * clear it is a lavender at a third of the hue's chroma. A card states both vocabularies at full
 * chroma anyway, because the two are always *labelled* where they meet: the ledger stacks a
 * Gameplay row on a Genre row, and the hero and hover subtitles name each swatch beside it. The
 * swatch says which chart a value is drawn in; the label is what says which of the two it is.
 *
 * Desaturating one of the ramps does not buy this back — it separates the two vocabularies by kind
 * without moving a single pair, and muting the genre ramp by 45% leaves the worst cross-table pair
 * at 4.5 dE and puts *more* pairs under 15, not fewer.
 *
 * Ratings and franchises deliberately do not draw on this: a rating ramp encodes an order, and a
 * franchise colour is somebody's brand, which keeps its hue and chroma and yields only lightness
 * to contrast. Neither is free to be reassigned a hue the way a gameplay style is.
 */
const gameplayColours: Record<Gameplay, Fill> = {
  Action: fill("#d85900", "#ff762c"),
  Adventure: fill("#008c36", "#00d556"),
  "Action Adventure": fill("#be6c00", "#ffa243"),
  "Driving/Racing": fill("#a98300", "#fac300"),
  Fighting: fill("#a50045", "#df005f"),
  "Party Games": fill("#b700b9", "#ec00ed"),
  Platformer: fill("#0089ea", "#3ca2ff"),
  Puzzle: fill("#a834ff", "#ad4cff"),
  "Role Playing": fill("#4800bc", "#7046ff"),
  Shooter: fill("#5d5b00", "#908c00"),
  Simulation: fill("#006d5d", "#00ebcb"),
  Strategy: fill("#005ba5", "#007ee1"),
  "Visual Novel": fill("#e60098", "#ff30ad"),
  "Music/Rhythm": fill("#00899b", "#00cbe3"),
};

export const gameplayToColour = ({ gameplay }: { gameplay: Gameplay }, scheme: Scheme): Colour =>
  pick(gameplayColours[gameplay] ?? NEUTRAL_FILL, scheme);

export const groupToColour = (group: keyof VideoGame | "none" | "decade", game: VideoGame, scheme: Scheme) => {
  switch (group) {
    case "decade":
      // The shared ramp, so a decade wedge means the same thing beside the Movies tab's.
      return decadeToColour(releaseDecade(game.releaseDate.year), scheme);
    case "company":
      return companyToColor(game, scheme);
    case "status":
      return statusToColour(game, scheme);
    case "rating":
      return ratingToColour(game, scheme);
    case "gameplay":
      return gameplayToColour(game, scheme);
    case "genre":
      return genreToColour(game.genre, scheme);
    case "franchise":
      return franchiseToColour(game, scheme);
    default:
      return "" as Colour;
  }
};
