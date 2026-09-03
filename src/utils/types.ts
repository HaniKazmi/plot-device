export type KeysMatching<T, V> = keyof { [P in keyof T as T[P] extends V ? P : never]: P };
export type Predicate<T> = (input: T) => boolean;

export type Distinct<T, DistinctName> = T & { __TYPE__: DistinctName };

export type Colour = Distinct<string, "Colour">;

/**
 * Which of the two papers a fill is being drawn on. Every colour lookup in this app takes one,
 * because a fill is a pair rather than a value — see `Fill`.
 */
export type Scheme = "light" | "dark";

/**
 * A chart colour, as the pair it has to be: the value for the #ffffff paper and the value for
 * the #1d2126 one.
 *
 * A single hex has to clear its contrast floor on both papers at once, and that confines it to
 * OKLCH L 0.526–0.668 — a span of 0.142. Chroma barely suffers inside that band, but lightness
 * is the identity of the warm half of the wheel: a yellow at L 0.67 is `#af9300`, an olive, and
 * the same hue at L 0.88 is `#fdd500`. Splitting the value in two lets each half sit where its
 * hue reads as itself and clear the full 3:1 against the one paper it is actually drawn on.
 */
export type Fill = readonly [light: Colour, dark: Colour];

/** The half of a fill that belongs on this paper. */
export const pick = (fill: Fill, scheme: Scheme): Colour => fill[scheme === "dark" ? 1 : 0];

/**
 * The status vocabulary this shared layer knows how to colour. Each domain declares its own
 * `Status` union, which stays assignable to this — the dependency deliberately does not run
 * the other way, so utils/ never imports from a domain folder.
 */
export const COLOURABLE_STATUSES = [
  "Playing",
  "Watching",
  "Reading",
  "Up To Date",
  "Endless",
  "Beat",
  "Ended",
  "Finished",
  "Cancelled",
  "Abandoned",
  "Next",
  "Backlog",
] as const;

export type ColourableStatus = (typeof COLOURABLE_STATUSES)[number];

/**
 * **The contract every chart fill in this app is held to**, stated here once and referred to from
 * each of the tables that has to meet it.
 *
 * A fill is a `Fill`: the light half is drawn only on the #ffffff paper and clears 3:1 against it,
 * the dark half only on #1d2126 and clears 3:1 against that. Neither half ever has to survive the
 * paper it is not on, which is what frees each to sit at the lightness its hue needs — a yellow
 * high, a blue low — instead of at the one lightness both papers would allow.
 *
 * Every value is placed in OKLCH from a stated hue and role and then solved until it clears the
 * floor, rather than picked and checked. `tests/utils/fillContract.test.ts` asserts the whole set.
 *
 * `NEUTRAL_FILL` itself is the colour of absence: a state that has not started, a category with no
 * colour of its own, the "Other" bucket a top-N list collects the tail into. One value across all
 * three, so a reader who has learnt that this grey means "nothing to say here" reads it the same
 * on every chart. Black beside coloured fills reads as another hue rather than as absence.
 */
/** A fill from its two hexes, so a table states values rather than casts. */
export const fill = (light: string, dark: string): Fill => [light as Colour, dark as Colour];

export const NEUTRAL_FILL = fill("#6e747e", "#868b94");

export const neutralFill = (scheme: Scheme): Colour => pick(NEUTRAL_FILL, scheme);

/**
 * The four media the app tracks, as a vocabulary every tab can speak.
 *
 * Singular and lower case because it is a discriminant on a record rather than a label;
 * `mediumToLabel` is what a legend reads. Held here rather than in `omnibus/` because a card's
 * franchise strip on any tab draws every medium a series was met in, and the shared layer may not
 * reach into the composing tab for a colour.
 */
export type Medium = "game" | "show" | "movie" | "book";

/** In the order the app says them, which is the order the tabs themselves run in. */
export const MEDIA: readonly Medium[] = ["game", "show", "movie", "book"];

/**
 * One fill per medium: the only colour a mixed-media surface carries meaning in.
 *
 * Each value meets the fill contract on `NEUTRAL_FILL`, half by half, and no medium reads as
 * louder than the others. The hues are the home tabs' own — arcade magenta for Games, screen-glow
 * teal for Shows, cinema red for Movies, page gold for Books — so a reader arriving from a tab
 * finds the colour it was already wearing, and they cannot be chosen independently of `tabs.ts`
 * without the two drifting. The closest pair is 16.8 dE, which is above what two fills need to be
 * told apart; the legend beside every bar and the medium name on every strip carry the rest.
 */
export const mediumFills: Record<Medium, Fill> = {
  game: fill("#bc00b6", "#ea00e3"),
  show: fill("#007f9f", "#00afdb"),
  movie: fill("#c93700", "#f34400"),
  book: fill("#857200", "#c6ac00"),
};

export const mediumToColour = (medium: Medium, scheme: Scheme): Colour => pick(mediumFills[medium], scheme);

/** How a medium reads in a legend, a header or a chip — the home tab's own name for itself. */
const mediumLabels: Record<Medium, string> = {
  game: "Games",
  show: "Shows",
  movie: "Movies",
  book: "Books",
};

export const mediumToLabel = (medium: Medium): string => mediumLabels[medium];

/**
 * The same names in the singular, for a label naming one item rather than a group.
 *
 * A legend, a header and a filter toggle all stand for a set and read in the plural; the band under
 * a single picture stands for that picture. Written out rather than trimmed from the plural, since
 * a vocabulary that gains a medium whose plural is not its name plus an "s" would otherwise be
 * wrong in one place and right in the other.
 */
const mediumNames: Record<Medium, string> = {
  game: "Game",
  show: "Show",
  movie: "Movie",
  book: "Book",
};

export const mediumToName = (medium: Medium): string => mediumNames[medium];

/**
 * A count of entries in the unit a medium is actually logged in, for a strip's legend: a show
 * contributes seasons rather than shows, because a season is the thing that was watched, and a
 * film is a film rather than a movie because that is the word the Movies tab counts in.
 */
const mediumUnits: Record<Medium, [string, string]> = {
  game: ["game", "games"],
  show: ["season", "seasons"],
  movie: ["film", "films"],
  book: ["book", "books"],
};

export const mediumUnit = (medium: Medium, count: number): string =>
  `${count} ${mediumUnits[medium][count === 1 ? 0 : 1]}`;

/**
 * Every certificate the sheets record, written the way its own board writes it.
 *
 * Games are recorded as PEGI, which carries the suffix (`16+`); Shows and Movies as BBFC, which
 * writes the bare number (`15`). Both notations are kept as the sheet holds them, because a card's
 * badge should read the way the certificate does.
 *
 * The ten are listed rather than derived by crossing the ages with an optional suffix: the two
 * boards do not issue the same set — PEGI has no 15 and BBFC no 16 — so a cross product admits
 * `15+` and `16`, which is the shape the likeliest typo takes and would pass validation.
 */
export const AGE_RATINGS = ["3", "7", "12", "15", "18", "3+", "7+", "12+", "16+", "18+"] as const;
export type AgeRating = (typeof AGE_RATINGS)[number];

/**
 * Whether a sheet cell holds an age rating, so a converter can reject a bad one where it still
 * knows which row it came from. Without this the first sign of trouble is `ageRatingToColour`
 * throwing from inside a render, naming a value but not the show or film that carried it.
 */
export const isAgeRating = (value: string): value is AgeRating => (AGE_RATINGS as readonly string[]).includes(value);

/**
 * The tier a rating names, which is the unit anything grouping across the two boards has to use.
 *
 * PEGI marks the age with a suffix and calls the middle tier 16; BBFC writes the bare number and
 * calls that same tier 15. So a grouping over the raw cell splits every tier in two by notation
 * alone — a PEGI 12+ game and a BBFC 12 film on separate shelves saying the same thing, and the
 * two halves of one tier drawn in the same colour beside each other. The band is keyed on the age
 * rather than on the notation, and is what the colour is looked up by, so the two cannot disagree
 * about which ratings are one thing.
 *
 * A band is named by its bare number, and by both numbers where the boards disagree on it: naming
 * the 15/16 tier after one board alone would put a PEGI 16 game under a heading no sheet of this
 * library writes for it. Only a grouping reads this — a card states the certificate its own row
 * carries, which is the value the reader would find in the sheet.
 */
const ratingBands: Record<number, string> = { 3: "3", 7: "7", 12: "12", 15: "15/16", 16: "15/16", 18: "18" };

export const ageRatingBand = (rating: AgeRating): string => {
  const band = ratingBands[parseInt(rating, 10)];
  // Throws rather than falling back, which is what catches a typo in the spreadsheet.
  if (!band) throw new Error("Unknown rating: " + rating);
  return band;
};

/**
 * The five ratings as stops on one continuous green-to-red sweep, anchored on the colours PEGI
 * actually prints: its lime `#a5c400` for the two greens, its amber `#f5a200` for the two ambers,
 * its red `#e2011a` for 18.
 *
 * PEGI gives 3 and 7 one colour and 12 and 16 another, so splitting each pair is a divergence, and
 * a necessary one — a chart that draws 3 and 7 in one fill cannot be read. What makes the split
 * visible is doing it on **hue as well as lightness**. This band is 0.142 of lightness wide, so a
 * pair separated by lightness alone lands about dE 11 apart where telling two fills apart wants
 * 15; separated on both axes they reach 19.0 and 15.0.
 *
 * Hue sweeps monotonically — 142° at 3 down to 25° at 18 — and that is what carries the traffic
 * light. Lightness deliberately does not: it alternates high-low-high-low across the sweep, which
 * is the second axis doing its job. A monotone ramp would put its two closest hues, 3 beside 7 and
 * 12 beside 15/16, at adjacent lightnesses too, and those are the exact pairs the divergence from
 * PEGI's own colours exists to tell apart.
 *
 * Keyed by band, so the colour tracks the age and not the notation: a PEGI 12+ game and a BBFC 12
 * film carry the same swatch — the two scales are never drawn on one chart, and a reader moving
 * between tabs would otherwise have to learn the same ramp twice. BBFC colours its own 15
 * certificate pink, which breaks the ordering the ramp depends on, and this table merges BBFC 15
 * with PEGI 16 into one band, so PEGI's ordering is the one that wins.
 */
const bandColours: Record<string, Fill> = {
  "3": fill("#14ac00", "#22fb00"),
  "7": fill("#707400", "#a9ae00"),
  "12": fill("#be7e00", "#fdaa00"),
  "15/16": fill("#aa4600", "#dd5e00"),
  "18": fill("#a10017", "#de0024"),
};

/**
 * Every band the ratings table colours, in ramp order.
 *
 * Written out rather than taken from `Object.keys`: four of the five keys are canonical array
 * indices and `"15/16"` is not, so JS enumerates them `3, 7, 12, 18, 15/16` — which would put 18
 * inside the ramp it is the end of, for any consumer that trusted the order.
 */
export const AGE_BANDS = ["3", "7", "12", "15/16", "18"];

/** The colour of a band, for a surface that has already grouped and holds the band and not a row. */
export const ageBandToColour = (band: string, scheme: Scheme): Colour => {
  const colour = bandColours[band];
  // Throws rather than falling back, which is what catches a typo in the spreadsheet.
  if (!colour) throw new Error("Unknown rating band: " + band);
  return pick(colour, scheme);
};

export const ageRatingToColour = (rating: AgeRating, scheme: Scheme): Colour =>
  ageBandToColour(ageRatingBand(rating), scheme);

/**
 * Hue says how a thing ended; luminance says whether it is still moving.
 *
 * Cyan is in progress, blue is caught up and waiting, the greens are done, amber was stopped by
 * someone else, rose was stopped by choice — and they step down in relative luminance in that
 * order, so a chart squinted at answers "how much of this is still alive?" before a single hue is
 * read. The order is stated in luminance rather than in lightness because that is what a reader
 * sees: a green at one OKLCH lightness carries roughly twice the luminance of a blue, so a ramp
 * placed on lightness alone puts Beat above Endless and the reading inverts.
 *
 * `Endless` and `Up To Date` are separate states rather than one. Up To Date is a show you are
 * current on that is still running — you are waiting on the source, which is as alive as a status
 * gets short of watching it, and it keeps the blue. Endless is a game with no completion state at
 * all; `vg/converter.ts` folds a Party game into it, and nothing about it was ever going to be
 * beaten. It takes a yellow-green beside Beat/Ended, as the second way a thing can be done with —
 * there was never an end to reach rather than one you got to — a step above Beat because a game
 * with no end is still one you might open again.
 *
 * The finished green sits a chroma step below the other terminal states: it is the majority of
 * every status chart, and a majority at full saturation is a wall.
 *
 * Playing, Watching and Reading are one state — in progress — in three media's words, and so are
 * Beat, Ended and Finished: each takes its state's fill exactly, so a stacked chart over the union
 * draws one colour per state rather than one per sheet's vocabulary.
 *
 * Next and Backlog have not started, so they take the same neutral grey the charts' "Other"
 * buckets wear: an inert state wants an inert colour, and black beside coloured fills reads as a
 * further hue rather than as absence.
 *
 * Every value meets the fill contract above.
 */
const statusColours: Record<ColourableStatus, Fill> = {
  Playing: fill("#00a2a3", "#00e5e8"),
  Watching: fill("#00a2a3", "#00e5e8"),
  Reading: fill("#00a2a3", "#00e5e8"),
  "Up To Date": fill("#0081e8", "#76b7ff"),
  Endless: fill("#557c00", "#78ac00"),
  Beat: fill("#326e54", "#489976"),
  Ended: fill("#326e54", "#489976"),
  Finished: fill("#326e54", "#489976"),
  Cancelled: fill("#7f4d00", "#b06d00"),
  Abandoned: fill("#9c0049", "#d80067"),
  Next: NEUTRAL_FILL,
  Backlog: NEUTRAL_FILL,
};

export const statusToColour = ({ status }: { status: ColourableStatus }, scheme: Scheme): Colour => {
  const colour = statusColours[status];
  // The guard is for a string the sheets hold that the union does not: it answers `undefined`
  // rather than throwing, because a wedge with no fill is a smaller failure than a page that will
  // not render. `colour` is a `Fill` in the types, so this still narrows to `Colour` for callers.
  return colour && pick(colour, scheme);
};

/**
 * The genre vocabulary all three tracked sheets share. It lives here rather than in any one domain
 * for the same reason `ageRatingToColour` does: Games, Shows and Movies each record their Genre
 * column in this one vocabulary, and a swatch has to mean the same thing on every tab. That is
 * what lets the Omnibus bridge a game to a film under one genre name without a mapping in code.
 *
 * Each hue is chosen to mean its genre — blood red for Horror, flame for Action, sepia for True
 * Story, yellow for Comedy, the outdoors for Adventure, noir teal for Mystery, electric cyan for
 * Sci-Fi, a grave blue for Drama, night indigo for Thriller, violet for Fantasy, rose for Romance.
 * Twelve hues is more than hue alone separates at one lightness — 27° apart is roughly dE 7, and
 * telling two fills apart wants 15 — so lightness alternates around the wheel and the legends
 * carry the rest. Every value meets the fill contract above.
 *
 * **Abstract is the exception, and it is the reason the rule above is worth stating.** Every other
 * genre borrows its colour from the thing it depicts. Abstract depicts nothing, so there is nothing
 * to borrow from — it takes magenta, which is the one hue with no wavelength behind it. No light is
 * magenta; the eye constructs it to close the gap between red and violet, where the red and blue
 * cones fire together with nothing in between. The genre that represents nothing takes the colour
 * that is not a representation of anything.
 *
 * It costs 10.1 dE against Fantasy on the white paper, which makes it the ramp's tightest pair,
 * just inside the 11.8 the Horror/Romance pair already sits at. That is the price of a twelfth
 * genre rather than of this one: with eleven genres, fourteen gameplay styles, nine tab colours and
 * four medium fills already placed, every hue on the wheel lands about 10 from something. Lime is
 * the better story for abstraction and scores 7.7, and re-solving Comedy and Adventure to open room
 * for it takes the ramp's worst pair from 10.8 to 9.1 while costing Comedy its yellow. The dark
 * half has no such problem and clears everything by 16.1.
 *
 * Two of these hexes also appear in `vg/types.ts`'s gameplay table: Action and Adventure, which
 * mean the same thing in both vocabularies and so are deliberately the same colour. The rest are
 * pushed as far apart as one band holds, which is not always far — Role Playing lands 2.3 from
 * Thriller on the dark paper. Both ramps are still drawn at full chroma, because the two are always
 * labelled where they meet: the ledger stacks a Gameplay row on a Genre row, and the hero and hover
 * subtitles name each swatch beside it.
 *
 * The lookup falls to `NEUTRAL_FILL` rather than throwing: the genre column is open-ended, and a
 * new genre appearing in the sheet should render as "no colour yet", not take the tab down. That
 * neutral is what makes an empty cell a converter's problem rather than this table's — every
 * converter reads the column through `readGenre`, because a blank reaching here is indistinguishable
 * from a genre nobody has coloured yet.
 */
const genreColours: Record<string, Fill> = {
  Abstract: fill("#f100dd", "#ff8fee"),
  Action: fill("#d85900", "#ff762c"),
  Adventure: fill("#008c36", "#00d556"),
  Comedy: fill("#a48c00", "#fad700"),
  Drama: fill("#004bd5", "#1d69ff"),
  Fantasy: fill("#c712ff", "#ce4eff"),
  Horror: fill("#aa002f", "#e40042"),
  Mystery: fill("#006667", "#009d9e"),
  Romance: fill("#c1007a", "#f00099"),
  "Sci-Fi": fill("#008dbe", "#00bcfc"),
  Thriller: fill("#701cff", "#7b4dff"),
  "True Story": fill("#805200", "#bb7a00"),
};

/** Every genre the shared ramp colours. The sheets may hold others, which take the neutral. */
export const GENRE_NAMES = Object.keys(genreColours);

export const genreToColour = (genre: string, scheme: Scheme): Colour =>
  pick(genreColours[genre] ?? NEUTRAL_FILL, scheme);

/**
 * Release decades as an ordered ramp: one warm hue family sweeping from a sepia gold for the
 * oldest to a deep russet for the newest, with lightness falling across the same span.
 *
 * A decade is ordered data, so the ramp stays one continuous gradient rather than a categorical
 * hue set. But lightness alone cannot carry eight steps inside this band: it puts neighbours about
 * 2.3 dE apart and the 2010s beside the 2020s at 0.8, which is under the ~2 dE at which two fills
 * are simply the same colour. Sweeping hue alongside it doubles the adjacent separation to 4.6 and
 * takes the ramp's ends from 13.4 dE apart to 32.1.
 *
 * The 2030s is here so the table does not need touching when the sheets reach it; `releaseDecade`
 * already answers `"2030s"` for a year in it. Everything before 1970 shares one bucket — the
 * sheets hold a handful of films there and no games at all.
 */
const decadeColours: Record<string, Fill> = {
  "Pre-1970": fill("#ac9000", "#ffdc4f"),
  "1970s": fill("#a88000", "#f7bd00"),
  "1980s": fill("#a17000", "#e9a300"),
  "1990s": fill("#9a6000", "#dc8b00"),
  "2000s": fill("#925000", "#d17600"),
  "2010s": fill("#894100", "#c96200"),
  "2020s": fill("#813000", "#c54d00"),
  "2030s": fill("#791a00", "#c83301"),
};

/** Every decade the ramp colours, including the one no sheet has reached yet. */
export const DECADE_NAMES = Object.keys(decadeColours);

export const releaseDecade = (year: number): string => (year < 1970 ? "Pre-1970" : `${Math.floor(year / 10) * 10}s`);

export const decadeToColour = (decade: string, scheme: Scheme): Colour =>
  pick(decadeColours[decade] ?? NEUTRAL_FILL, scheme);

/**
 * A franchise's own brand hex, filling the sunburst's franchise ring, every tab's Top Franchise
 * bar, and the Omnibus gallery's franchise shelves.
 *
 * Shared rather than owned by Games, for the reason the genre ramp is: all three sheets record a
 * Franchise column, and eleven franchises are met in more than one medium — Marvel across all
 * three, Star Wars and Harry Potter across games and film, Fate and Star Trek across games and
 * television. A per-domain table would draw one of those a different colour on each tab, which is
 * the one thing a shared vocabulary exists to prevent.
 *
 * Hue and chroma are the brand's and are kept exactly; only lightness moves, and only as far as
 * the fill contract on `NEUTRAL_FILL` demands of the half being drawn. A brand already inside the
 * band on both papers therefore carries one value twice — Mario, Marvel and Zelda all do.
 *
 * Eight entries relax the floor on the **white paper alone**, keeping the full 3:1 on the dark one.
 * The relief is what the contract allows where colour is not carrying the meaning by itself, and
 * this is that case: the sunburst labels its franchise ring, every Top Franchise row is named
 * beside its swatch, and a gallery shelf carries its franchise as a heading. Witcher, Uncharted,
 * Assassin's Creed and Tales need only 2.2:1 and then carry their brand hex exactly on both
 * papers. Pokémon, Warcraft, Star Wars and Star Trek are the four whose identity *is* their
 * brightness, and they go to 1.8 — a yellow held to 3:1 on white is not a yellow but a brown-gold,
 * which is 20.8 dE from what Pokémon actually looks like and 26.0 from Star Wars.
 *
 * What the clamp costs is separation between brands that already share a hue, and this table is
 * where that lands hardest. Mario, Marvel, Xenoblade, Fate, Mass Effect, Yakuza and Harry Potter
 * are seven reds; Final Fantasy, Ace Attorney, Civilization, DC, Disney and Doctor Who six blues.
 * The set is scoped so those never crowd one chart: a Top Franchise bar draws five groups from one
 * sheet, and the reds and blues are spread across the three. Marvel beside Harry Potter on the
 * Movies bar is the closest pair anywhere at 10.7 dE on the dark paper, and the row labels are
 * load-bearing for it.
 *
 * The table covers what a tab's collapsed Top Franchise card and the gallery's shelves actually
 * draw, plus every cross-media franchise among them. The long tail — 168 franchise values in the
 * games sheet alone, most of them a work naming itself — deliberately has none, the same rule
 * `networkToColour` follows: a vocabulary nobody can learn teaches nothing, and `""` hands the
 * choice to Highcharts.
 */
const franchiseColours: Record<string, Fill> = {
  // Games
  Pokémon: fill("#ebbb00", "#ffcb05"),
  "Final Fantasy": fill("#009eda", "#039fdb"),
  "Ace Attorney": fill("#2b52c3", "#3c66d9"),
  Mario: fill("#e60012", "#e60012"),
  "Call of Duty": fill("#666f3b", "#6d7642"),
  "Dragon Ball": fill("#f45712", "#f85b1a"),
  "Assassin's Creed": fill("#a9adb3", "#a9adb3"),
  "Legend of Zelda": fill("#1a8a34", "#1a8a34"),
  Tales: fill("#38bfb4", "#38bfb4"),
  Uncharted: fill("#bdaa8b", "#bdaa8b"),
  Yakuza: fill("#c0393d", "#c0393d"),
  "Super Smash Bros.": fill("#ff4500", "#ff4500"),
  Xenoblade: fill("#e60026", "#e60026"),
  Warcraft: fill("#fcb249", "#ffb54c"),
  "Mass Effect": fill("#d12026", "#d12026"),
  Civilization: fill("#1e6fad", "#2575b3"),
  Persona: fill("#4557a2", "#566ab7"),
  // Met in more than one medium
  Marvel: fill("#ed1d24", "#ed1d24"),
  Fate: fill("#cb2c28", "#cb2c28"),
  Witcher: fill("#8f95a1", "#8f95a1"),
  "Star Wars": fill("#d7c200", "#f8e102"),
  "Harry Potter": fill("#7e0f0b", "#b5483c"),
  DC: fill("#0576f3", "#0476f2"),
  "Star Trek": fill("#e2be00", "#ffd700"),
  // Shows
  "Doctor Who": fill("#0b4573", "#3f74a6"),
  "Breaking Bad": fill("#00892b", "#01892b"),
  // Judgment rather than a published hex: neither has a brand colour of its own, and both lead
  // their tab's Top Franchise card, where a palette hue beside five branded ones reads as a gap.
  "Vampire Diaries": fill("#6b2d8b", "#8e50b0"),
  // Films
  Disney: fill("#113ccf", "#2a5ff2"),
  Pixar: fill("#28a4a2", "#2ca6a4"),
};

/** Every franchise the table colours; anything else reads as having no colour of its own. */
export const FRANCHISE_NAMES = Object.keys(franchiseColours);

/**
 * `""` off the table, which every caller reads as no colour at all — the same answer
 * `networkToColour` gives, and for the same reason: the column is open-ended and most of what it
 * holds is a work naming itself.
 */
export const franchiseToColour = ({ franchise }: { franchise: string }, scheme: Scheme): Colour => {
  const colour = franchiseColours[franchise];
  return colour ? pick(colour, scheme) : ("" as Colour);
};

export const scoreBands = ["9–10", "7–8", "5–6", "3–4", "1–2", "Unscored"] as const;

export type ScoreBand = (typeof scoreBands)[number];

/** Five bands so a totals bar's legend fits one line; unscored is its own state, not a low one. */
export const scoreBand = (score: number | undefined): ScoreBand => {
  if (score === undefined) return "Unscored";
  if (score >= 9) return "9–10";
  if (score >= 7) return "7–8";
  if (score >= 5) return "5–6";
  if (score >= 3) return "3–4";
  return "1–2";
};

/**
 * Red through amber to green, because a score is valenced and not merely ordered — a 2 is a
 * different judgement from an 8, and hue is what can say so. Hue has to carry the scale anyway:
 * the fill contract confines every value to one narrow lightness band, so a single-hue ramp only
 * has five near-identical steps to give, and its palest step lands a hair from the neutral that
 * means Unscored. Lightness arches — dark at both poles, lightest at the amber middle — so
 * neighbouring bands separate by brightness as well as hue. The amber is held a step lighter and
 * yellower than the golds a tab draws in its own bands beside this one, so two ramps meeting on
 * one card are not read as sharing a hue. Every value meets the fill contract.
 *
 * Shared here rather than kept on the Movies tab because Books scores on the same ten-point
 * scale: one ramp means a 9 wears one green on both tabs, and a tracked domain may not import
 * another's vocabulary.
 */
const scoreBandColours: Record<ScoreBand, Fill> = {
  "9–10": fill("#007338", "#04ab57"),
  "7–8": fill("#298d00", "#63c94a"),
  "5–6": fill("#ac8b00", "#f8cc20"),
  "3–4": fill("#b65800", "#ea7300"),
  "1–2": fill("#af0025", "#de1e39"),
  Unscored: NEUTRAL_FILL,
};

export const scoreBandToColour = (band: ScoreBand, scheme: Scheme): Colour => pick(scoreBandColours[band], scheme);
