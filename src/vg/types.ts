import type { Year, YearMonthDay } from "../common/date";
import {
  NEUTRAL_FILL,
  ageRatingToColour,
  decadeToColour,
  releaseDecade,
  statusToColour,
  type AgeRating,
  type Colour,
  type KeysMatching,
} from "../utils/types";

export interface VideoGame {
  name: string;
  platform: Platform;
  company: Company;
  developer: string;
  publisher: string;
  franchise: string;
  genre: Genre;
  theme: string[];
  rating: AgeRating;
  releaseDate: YearMonthDay;
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
export type Genre =
  | "Action"
  | "Adventure"
  | "Action Adventure"
  | "Driving/Racing"
  | "Fighting"
  | "Party Games"
  | "Platformer"
  | "Puzzle"
  | "Role Playing"
  | "Shooter"
  | "Simulation"
  | "Strategy"
  | "Visual Novel"
  | "Music/Rhythm";

export type Measure = "Hours" | "Games";

/**
 * A company has two colours, and which one is right depends on how much of the screen it covers.
 *
 * The fills below are the ones chart geometry uses — sunburst wedges, barchart series, timeline
 * bars, stacked segments, card strips. They meet the fill contract on `NEUTRAL_FILL`, in one
 * lightness band, and each keeps its brand's hue. A brand hex is chosen to stand alone against
 * white, and a set of them is not a scale:
 * Nintendo's #e60012 at full saturation beside four neighbours reads as one shouting value.
 *
 * PC and iOS stay neutral because neutrality is those brands' identity — a taupe and a space
 * grey, clamped only in lightness. Giving either a real hue would make it separable at a glance
 * but would name the wrong brand; a blue-violet iOS in particular reads as PlayStation's
 * neighbour. The cost is that the two neutrals separate from each other and from PlayStation by
 * lightness and warmth rather than hue, which is below what colour alone should carry — the
 * wedge labels, legend names and the 2px gaps between segments are load-bearing for those pairs.
 *
 * The accents are the brand hexes themselves, for the chip in a card's corner. A chip is a few
 * dozen pixels of solid colour carrying two or three letters, so it is read as a badge rather than
 * compared against its neighbours — full saturation is what makes it recognisable at that size,
 * and there is no adjacent wedge for it to have to separate from.
 */
const companyColours: Record<Company, { fill: Colour; accent: Colour }> = {
  Nintendo: { fill: "#d74840" as Colour, accent: "#e60012" as Colour },
  PlayStation: { fill: "#2474cf" as Colour, accent: "#0070cc" as Colour },
  Xbox: { fill: "#139948" as Colour, accent: "#107c10" as Colour },
  PC: { fill: "#9d8358" as Colour, accent: "#b5a596" as Colour },
  iOS: { fill: "#6e737a" as Colour, accent: "#555555" as Colour },
};

/**
 * The chart fill. `undefined` for a company outside the table, which is what lets `platformToColor`
 * turn a platform string whose first word is not a bare company name into a loud error rather than
 * an uncoloured bar.
 */
export const companyToColor = ({ company }: { company: Company }): Colour => companyColours[company]?.fill;

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
export const platformToColor = (platform: Platform | { platform: Platform }) => {
  const value = typeof platform === "object" ? platform.platform : platform;
  const colour = platformShortNames[value] && companyToColor({ company: value.split(" ")[0] as Company });
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

export const ratingToColour = ({ rating }: VideoGame) => ageRatingToColour(rating);

/**
 * A genre has no brand to reproduce, so each colour is chosen to *represent* the genre: flame for
 * Action, exploration green for Adventure, the leather-bronze between them for Action Adventure,
 * a dashboard amber for Driving/Racing, military olive for Shooter, crimson for Fighting, party
 * magenta, sakura pink for Visual Novel, sky blue for Platformer, steel blue for Strategy, indigo
 * for Role Playing, violet for Puzzle, a blueprint teal for Simulation and cyan for Music/Rhythm.
 * Action takes the flame end of red rather than a pillar-box red because sRGB has no bright red:
 * red only exists low in the lightness range, and Fighting's crimson is what occupies it.
 *
 * Every value sits in the same lightness band as the company fills, meeting the fill contract on
 * `NEUTRAL_FILL`, with chroma taken as high as sRGB allows at that lightness. Fourteen hues in one
 * band is more than hue alone can
 * separate — 27° apart is roughly ΔE 7, and telling two fills apart wants 15 — so lightness
 * alternates around the hue wheel and neighbours land at opposite ends of the band.
 *
 * Strategy is the one deliberately deep member of the blues. A red-blind reader sees violet as
 * blue, so a light steel blue beside Puzzle's light violet is ΔE 1 to them however far apart the
 * hues are; only lightness separates that pair, and the two are adjacent on the Top Genre bar.
 * Platformer's sky blue is then the light half of the same hue, which is what those two names
 * mean anyway.
 *
 * Ratings and franchises deliberately do not draw on this: a rating ramp encodes an order, and a
 * franchise colour is somebody's brand, which keeps its hue and chroma and yields only lightness
 * to contrast. Neither is free to be reassigned a hue the way a genre is.
 */
const genreColours: Record<Genre, Colour> = {
  Action: "#fe4c00" as Colour,
  Adventure: "#13ac00" as Colour,
  "Action Adventure": "#a85500" as Colour,
  "Driving/Racing": "#ae9200" as Colour,
  Fighting: "#d5005e" as Colour,
  "Party Games": "#bc00c8" as Colour,
  Platformer: "#3893ff" as Colour,
  Puzzle: "#c357ff" as Colour,
  "Role Playing": "#7543ff" as Colour,
  Shooter: "#667100" as Colour,
  Simulation: "#008268" as Colour,
  Strategy: "#0072c5" as Colour,
  "Visual Novel": "#ff1da7" as Colour,
  "Music/Rhythm": "#00a4b1" as Colour,
};

export const genreToColour = ({ genre }: { genre: Genre }): Colour => genreColours[genre] ?? NEUTRAL_FILL;

/**
 * A franchise's own brand hex, filling the sunburst's franchise ring and the Top Franchise bar.
 *
 * Hue and chroma are the brand's and are kept exactly; only lightness moves, and only as far as
 * the fill contract on `NEUTRAL_FILL` demands. Yakuza's #A31925 is 2.10:1 on dark and
 * Civilization's #005E9B is 2.37:1, so both lift a step rather than being reassigned a hue. Chroma
 * gives way only where the clamped lightness leaves sRGB, which Final Fantasy's cyan is the one
 * entry to still do.
 *
 * Seven entries take that contract's relief, because the clamp would destroy the thing it was
 * meant to preserve: a yellow held to 3:1 on white is no longer yellow, it is a brown-gold, and
 * Persona held to 3:1 on dark is a royal blue rather than a near-black indigo. Pokémon, Warcraft,
 * Assassin's Creed, Uncharted and Tales are the bright five; Persona and Ace Attorney the deep
 * two. What earns them the relief is that nothing here is colour alone — the sunburst labels its
 * wedges and the Top Franchise list carries a named legend. Two of the five also regain the chroma
 * a darker clamp took out of them: yellow's gamut widens as it lightens.
 *
 * Call of Duty keeps the plain clamp despite being a military drab, because dropping its olive
 * deeper collapses it onto Mario's red under red-blind vision — ΔE 1.8 where the clamped value
 * holds 7.7, and those two are neighbours on the Top Franchise bar.
 *
 * What that costs is separation between brands that already share a hue. Mario, Marvel,
 * Xenoblade, Fate, Mass Effect and Yakuza are six reds inside 5° of each other, and clamping
 * them into one lightness band leaves them near-indistinguishable side by side. The wedge
 * labels, the legend names and the gaps between segments are load-bearing for that group.
 */
const franchiseColours: Record<string, Colour> = {
  Pokémon: "#d3a700" as Colour,
  "Final Fantasy": "#039FDB" as Colour,
  "Ace Attorney": "#2b52c3" as Colour,
  Mario: "#E60012" as Colour,
  "Call of Duty": "#666F3B" as Colour,
  "Dragon Ball": "#F85B1A" as Colour,
  "Assassin's Creed": "#a9adb3" as Colour,
  "Legend of Zelda": "#1A8A34" as Colour,
  Marvel: "#ED1D24" as Colour,
  Tales: "#38bfb4" as Colour,
  Uncharted: "#bdaa8b" as Colour,
  Yakuza: "#C0393D" as Colour,
  "Super Smash Bros.": "#FF4500" as Colour,
  Xenoblade: "#E60026" as Colour,
  Fate: "#CB2C28" as Colour,
  Warcraft: "#dda300" as Colour,
  "Mass Effect": "#D12026" as Colour,
  Witcher: "#8F95A1" as Colour,
  Civilization: "#1E6FAD" as Colour,
  Persona: "#4557a2" as Colour,
};

/** The empty colour for a franchise outside the table, which every caller reads as no colour at all. */
export const franchiseToColour = ({ franchise }: { franchise: string }): Colour =>
  franchiseColours[franchise] ?? ("" as Colour);

export const groupToColour = (group: keyof VideoGame | "none" | "decade", game: VideoGame) => {
  switch (group) {
    case "decade":
      // The shared ramp, so a decade wedge means the same thing beside the Movies tab's.
      return decadeToColour(releaseDecade(game.releaseDate.year));
    case "company":
      return companyToColor(game);
    case "status":
      return statusToColour(game);
    case "rating":
      return ratingToColour(game);
    case "genre":
      return genreToColour(game);
    case "franchise":
      return franchiseToColour(game);
    default:
      return "" as Colour;
  }
};
