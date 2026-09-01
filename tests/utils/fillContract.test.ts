import { describe, expect, it } from "vitest";
import {
  AGE_BANDS,
  AGE_RATINGS,
  COLOURABLE_STATUSES,
  DECADE_NAMES,
  FRANCHISE_NAMES,
  GENRE_NAMES,
  ageBandToColour,
  ageRatingToColour,
  decadeToColour,
  franchiseToColour,
  genreToColour,
  neutralFill,
  releaseDecade,
  statusToColour,
  type Scheme,
} from "../../src/utils/types";
import {
  COMPANIES,
  GAMEPLAY,
  companyToColor,
  gameplayToColour,
  groupToColour as vgGroupToColour,
} from "../../src/vg/types";
import { NETWORK_NAMES, groupToColour as showGroupToColour, networkToColour, typeToColour } from "../../src/show/types";
import {
  cinemaToColour,
  groupToColour as movieGroupToColour,
  scoreBands,
  scoreBandToColour,
} from "../../src/movie/types";
import { BOOK_FILL, media, mediumToColour } from "../../src/omnibus/types";
import { pick } from "../../src/utils/types";
import { PAPERS, contrast, liveGenres } from "../fixtures/colour";
import { videoGame } from "../fixtures/vgRows";
import { show } from "../fixtures/shows";
import { movie } from "../fixtures/movies";

/**
 * The fill contract, asserted over every table rather than argued for in each one's doc comment.
 *
 * A fill is a pair: the light half is drawn only on `#ffffff` and the dark half only on `#1d2126`,
 * and each clears 3:1 against the one paper it is on. Nothing here checks a half against the paper
 * it never meets — that is the whole point of splitting the value, and holding both halves to both
 * papers would re-impose the single narrow lightness band the pair exists to escape.
 *
 * Every list is the table's own, exported beside it rather than restated here: a franchise added to
 * `vg/types.ts` or a network to `show/types.ts` is covered without anyone remembering this file,
 * which is the only way a contract test stays one.
 *
 * `contrast` is a second implementation of the WCAG formula rather than an import, so this cannot
 * pass by agreeing with a bug in `src/`.
 *
 * The relief the contract allows is pinned here rather than left to each table's prose: six
 * franchise brands relax the floor on the white paper alone, because their identity is their
 * brightness and a yellow held to 3:1 there is a brown-gold. Listing them means adding a seventh
 * is a decision someone has to write down, not something that slips through.
 */
const FLOOR = 3;

/** Franchises whose light half takes the contract's relief, and the floor each is held to. */
const LIGHT_RELIEF: Record<string, number> = {
  // The two whose brand *is* a bright yellow; 2.2 still reads as gold on both.
  Pokémon: 1.8,
  Warcraft: 1.8,
  "Star Wars": 1.8,
  "Star Trek": 1.8,
  // These four carry their brand hex exactly once the floor is 2.2.
  Witcher: 2.2,
  Uncharted: 2.2,
  "Assassin's Creed": 2.2,
  Tales: 2.2,
};

const SCHEMES: Scheme[] = ["light", "dark"];

describe.each(SCHEMES)("every fill clears 3:1 on the %s paper", (scheme) => {
  const check = (name: string, colour: string) => {
    expect(colour, `${name} is ${colour}`).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrast(colour, PAPERS[scheme]), `${name} (${colour})`).toBeGreaterThanOrEqual(FLOOR);
  };

  it("the neutral, which every table falls back to", () => check("neutral", neutralFill(scheme)));

  it("age ratings, by certificate and by band", () => {
    for (const rating of AGE_RATINGS) check(`rating ${rating}`, ageRatingToColour(rating, scheme));
    for (const band of AGE_BANDS) check(`band ${band}`, ageBandToColour(band, scheme));
  });

  it("statuses", () => {
    for (const status of COLOURABLE_STATUSES) check(`status ${status}`, statusToColour({ status }, scheme));
  });

  it("genres, over the ramp's own values and everything the three sheets record", () => {
    for (const genre of GENRE_NAMES) check(`genre ${genre}`, genreToColour(genre, scheme));
    // A sheet genre the ramp has no entry for lands on the neutral, which has to clear too.
    for (const genre of liveGenres) check(`sheet genre ${genre}`, genreToColour(genre, scheme));
  });

  it("release decades, including the one no sheet has reached", () => {
    for (const decade of DECADE_NAMES) check(`decade ${decade}`, decadeToColour(decade, scheme));
    // The ramp is keyed on what `releaseDecade` answers, so the two cannot drift apart.
    check("decade 2031", decadeToColour(releaseDecade(2031), scheme));
  });

  it("console makers", () => {
    for (const company of COMPANIES) check(`company ${company}`, companyToColor({ company }, scheme));
  });

  it("gameplay styles", () => {
    for (const gameplay of GAMEPLAY) check(`gameplay ${gameplay}`, gameplayToColour({ gameplay }, scheme));
  });

  it("franchises, and the six whose light half takes the relief", () => {
    for (const franchise of FRANCHISE_NAMES) {
      const relief = scheme === "light" ? LIGHT_RELIEF[franchise] : undefined;
      const colour = franchiseToColour({ franchise }, scheme);
      if (relief === undefined) check(`franchise ${franchise}`, colour);
      else
        expect(contrast(colour, PAPERS[scheme]), `franchise ${franchise} (${colour})`).toBeGreaterThanOrEqual(relief);
    }
    // Every relief is on the white paper only: the dark half is the brand hex and clears in full.
    for (const franchise of Object.keys(LIGHT_RELIEF)) {
      expect(contrast(franchiseToColour({ franchise }, "dark"), PAPERS.dark), franchise).toBeGreaterThanOrEqual(FLOOR);
    }
  });

  it("networks and show types", () => {
    for (const network of NETWORK_NAMES) check(`network ${network}`, networkToColour({ network }, scheme));
    for (const type of ["show", "anime"] as const) check(`type ${type}`, typeToColour({ type }, scheme));
  });

  it("score bands and where a film was seen", () => {
    for (const band of scoreBands) check(`score ${band}`, scoreBandToColour(band, scheme));
    for (const label of ["Cinema", "Home"]) check(`seen in ${label}`, cinemaToColour(label, scheme));
  });

  it("media, the one vocabulary the Omnibus teaches", () => {
    for (const medium of media) check(`medium ${medium}`, mediumToColour(medium, scheme));
    // Reserved for the Books tab and drawn nowhere yet, so this is the only thing stopping it
    // drifting below the floor while it waits.
    check("medium book", pick(BOOK_FILL, scheme));
  });
});

/**
 * The property the shared franchise table exists for, pinned so it cannot quietly fork back into
 * per-domain copies: a franchise met in more than one medium is one colour wherever it is drawn.
 */
describe("one franchise, one colour, every tab", () => {
  const CROSS_MEDIA = ["Marvel", "Star Wars", "Harry Potter", "Mario", "DC", "Fate", "Witcher", "Star Trek"];

  it.each(CROSS_MEDIA)("draws %s the same on Games, Shows and Movies", (franchise) => {
    for (const scheme of SCHEMES) {
      const fromGames = vgGroupToColour("franchise", videoGame({ franchise }), scheme);
      const fromShows = showGroupToColour("franchise", show({ franchise }), scheme);
      const fromMovies = movieGroupToColour("franchise", movie({ franchise }), scheme);

      expect(fromGames, `${franchise} on ${scheme}`).not.toBe("");
      expect(fromShows, `${franchise} on ${scheme}`).toBe(fromGames);
      expect(fromMovies, `${franchise} on ${scheme}`).toBe(fromGames);
    }
  });
});
