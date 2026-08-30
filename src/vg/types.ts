import type { Year, YearMonthDay } from "../common/date";
import { statusToColour, type Colour, type KeysMatching } from "../utils/types";

export interface VideoGame {
  name: string;
  platform: Platform;
  company: Company;
  developer: string;
  publisher: string;
  franchise: string;
  genre: Genre;
  theme: string[];
  rating: string;
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
 * bars, stacked segments, card strips. They sit in one lightness band, so each clears 3:1 against
 * both surfaces the app paints on (#ffffff paper and #1d2126 paper), and each keeps its brand's
 * hue. A brand hex is chosen to stand alone against white, and a set of them is not a scale:
 * Nintendo's #e60012 at full saturation beside four neighbours reads as one shouting value.
 *
 * PC and iOS stay neutral because neutrality is those brands' identity — a taupe and a space
 * grey, clamped only in lightness. Giving either a real hue would make it separable at a glance
 * but would name the wrong brand; a blue-violet iOS in particular reads as PlayStation's
 * neighbour. The cost is that the two neutrals separate from each other and from PlayStation by
 * lightness and warmth rather than hue, which is below what colour alone should carry — the
 * wedge labels, legend names and the 2px gaps between segments are load-bearing for those pairs.
 */
const nintendoFill = "#d74840" as Colour;
const playstationFill = "#2474cf" as Colour;
const xboxFill = "#139948" as Colour;
const pcFill = "#9d8358" as Colour;
const iosFill = "#6e737a" as Colour;

/**
 * The brand hexes, for the chip in a card's corner. A chip is a few dozen pixels of solid colour
 * carrying two or three letters, so it is read as a badge rather than compared against its
 * neighbours — full saturation is what makes it recognisable at that size, and there is no
 * adjacent wedge for it to have to separate from.
 */
const nintendoAccent = "#e60012" as Colour;
const playstationAccent = "#0070cc" as Colour;
const xboxAccent = "#107c10" as Colour;
const pcAccent = "#b5a596" as Colour;
const iosAccent = "#555555" as Colour;

export const companyToColor = ({ company }: { company: Company }) => {
  switch (company) {
    case "Nintendo":
      return nintendoFill;
    case "PlayStation":
      return playstationFill;
    case "Xbox":
      return xboxFill;
    case "PC":
      return pcFill;
    case "iOS":
      return iosFill;
  }
};

export const companyToAccent = ({ company }: { company: Company }) => {
  switch (company) {
    case "Nintendo":
      return nintendoAccent;
    case "PlayStation":
      return playstationAccent;
    case "Xbox":
      return xboxAccent;
    case "PC":
      return pcAccent;
    case "iOS":
      return iosAccent;
  }
};

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
 * `companyToColor` has no default branch, so a platform whose first word is not a bare company
 * name would otherwise return `undefined` and render as an uncoloured bar.
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

export const ratingToColour = ({ rating }: VideoGame) => {
  switch (rating) {
    case "3+":
      return "#88c32f" as Colour;
    case "7+":
      return "#6d9c26" as Colour;
    case "12+":
      return "#c27400" as Colour;
    case "16+":
      return "rgb(242,144,0)" as Colour;
    case "18+":
      return "#d60015" as Colour;
    default:
      throw new Error("Unknown rating: " + rating);
  }
};

/**
 * A genre has no brand to reproduce, so each colour is chosen to *represent* the genre: flame for
 * Action, exploration green for Adventure, the leather-bronze between them for Action Adventure,
 * a dashboard amber for Driving/Racing, military olive for Shooter, crimson for Fighting, party
 * magenta, sakura pink for Visual Novel, sky blue for Platformer, steel blue for Strategy, indigo
 * for Role Playing, violet for Puzzle, a blueprint teal for Simulation and cyan for Music/Rhythm.
 * Action takes the flame end of red rather than a pillar-box red because sRGB has no bright red:
 * red only exists low in the lightness range, and Fighting's crimson is what occupies it.
 *
 * Every value sits in the same lightness band as the company fills, so each clears 3:1 against
 * both surfaces the app paints on (#ffffff paper and #1d2126 paper), with chroma taken as high as
 * sRGB allows at that lightness. A colour picked for the light card alone washes out on the dark
 * one; `#ffeb3b` against white is 1.22:1. Fourteen hues in one band is more than hue alone can
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
const genreToColour = ({ genre }: { genre: Genre }) => {
  switch (genre) {
    case "Action":
      return "#fe4c00" as Colour;
    case "Adventure":
      return "#13ac00" as Colour;
    case "Action Adventure":
      return "#a85500" as Colour;
    case "Driving/Racing":
      return "#ae9200" as Colour;
    case "Fighting":
      return "#d5005e" as Colour;
    case "Party Games":
      return "#bc00c8" as Colour;
    case "Platformer":
      return "#3893ff" as Colour;
    case "Puzzle":
      return "#c357ff" as Colour;
    case "Role Playing":
      return "#7543ff" as Colour;
    case "Shooter":
      return "#667100" as Colour;
    case "Simulation":
      return "#008268" as Colour;
    case "Strategy":
      return "#0072c5" as Colour;
    case "Visual Novel":
      return "#ff1da7" as Colour;
    case "Music/Rhythm":
      return "#00a4b1" as Colour;
    default:
      return "#7d828c" as Colour;
  }
};

/**
 * A franchise's own brand hex, filling the sunburst's franchise ring and the Top Franchise bar.
 *
 * Hue and chroma are the brand's and are kept exactly; only lightness moves, and only as far as
 * clearing 3:1 against both surfaces the app paints on (#ffffff paper and #1d2126 paper) demands.
 * Yakuza's #A31925 is 2.10:1 on dark and Civilization's #005E9B is 2.37:1, so both lift a step
 * rather than being reassigned a hue. Chroma gives way only where the clamped lightness leaves
 * sRGB, which Final Fantasy's cyan is the one entry to still do.
 *
 * Where a brand *is* its brightness or its darkness, that clamp destroys the thing it was meant
 * to preserve: a yellow held to 3:1 on white is no longer yellow, it is a brown-gold, and Persona
 * held to 3:1 on dark is a royal blue rather than a near-black indigo. Those entries relax the
 * floor on the offending surface to 2.2:1 and clamp only to that, keeping the full 3:1 on the
 * other. Pokémon, Warcraft, Assassin's Creed, Uncharted and Tales are the bright five; Persona
 * and Ace Attorney the deep two. The relief is that nothing here is colour alone — the sunburst
 * labels its wedges and the Top Franchise list carries a named legend — which is exactly the
 * secondary encoding a sub-3:1 fill is allowed to lean on. Two of the five also regain the chroma
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
const franchiseToColour = ({ franchise }: { franchise: string }) => {
  switch (franchise) {
    case "Pokémon":
      return "#d3a700" as Colour;
    case "Final Fantasy":
      return "#039FDB" as Colour;
    case "Ace Attorney":
      return "#2b52c3" as Colour;
    case "Mario":
      return "#E60012" as Colour;
    case "Call of Duty":
      return "#666F3B" as Colour;
    case "Dragon Ball":
      return "#F85B1A" as Colour;
    case "Assassin's Creed":
      return "#a9adb3" as Colour;
    case "Legend of Zelda":
      return "#1A8A34" as Colour;
    case "Marvel":
      return "#ED1D24" as Colour;
    case "Tales":
      return "#38bfb4" as Colour;
    case "Uncharted":
      return "#bdaa8b" as Colour;
    case "Yakuza":
      return "#C0393D" as Colour;
    case "Super Smash Bros.":
      return "#FF4500" as Colour;
    case "Xenoblade":
      return "#E60026" as Colour;
    case "Fate":
      return "#CB2C28" as Colour;
    case "Warcraft":
      return "#dda300" as Colour;
    case "Mass Effect":
      return "#D12026" as Colour;
    case "Witcher":
      return "#8F95A1" as Colour;
    case "Civilization":
      return "#1E6FAD" as Colour;
    case "Persona":
      return "#4557a2" as Colour;
    default:
      return "" as Colour;
  }
};

export const groupToColour = (group: keyof VideoGame | "none", game: VideoGame) => {
  switch (group) {
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
