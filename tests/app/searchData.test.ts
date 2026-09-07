import { describe, expect, it } from "vitest";
import { Year, YearMonthDay } from "../../src/common/date";
import { toOmniItems } from "../../src/app/library";
import { rankHits } from "../../src/common/searchData";
import {
  attributeAction,
  attributePlacements,
  attributeWorks,
  buildAttributeIndex,
  buildSearchIndex,
  franchiseFacts,
  franchiseWorks,
  recentFranchises,
  searchUnion,
  unionEpoch,
  type SearchGroup,
  searchScope,
  SCOPE_ROWS,
  type SearchEntry,
  type ValueSearchEntry,
} from "../../src/app/searchData";
import { workLabels } from "../../src/app/cardData";
import { book } from "../fixtures/books";
import { library } from "../fixtures/library";
import { movie } from "../fixtures/movies";
import { season, show } from "../fixtures/shows";
import { videoGame } from "../fixtures/gameRows";

const TODAY = YearMonthDay.get(2026, 9, 1);

const showWithSeasons = (count: number, overrides = {}) => {
  const parent = show(overrides);
  for (let i = 0; i < count; i++) {
    parent.s.push(
      season(parent, {
        startDate: YearMonthDay.get(2020 + i, 1, 1),
        endDate: YearMonthDay.get(2020 + i, 6, 1),
        subtitle: i === 1 ? "The Cage" : undefined,
      }),
    );
  }
  return parent;
};

const trekLibrary = () =>
  library({
    game: [videoGame({ name: "Star Trek: Resurgence", franchise: "Star Trek", hours: 11 })],
    show: [showWithSeasons(3, { name: "Star Trek: Strange New Worlds", franchise: "Star Trek" })],
    movie: [movie({ name: "Star Trek Beyond", franchise: "Star Trek" })],
    book: [book()],
  });

const trek = () => toOmniItems(trekLibrary());

/** The whole index, over one library and the union built from it. */
const trekIndex = () => buildSearchIndex(trek(), trekLibrary());

/** The values a query matched, which is where every reading of a value stands. */
const valuesOf = (groups: SearchGroup[]) =>
  (groups.find((group) => group.key === "values")?.hits ?? []).map((hit) => hit.entry as ValueSearchEntry);

/** What a hit's row is titled by, which for a value is the attribute it stands for. */
const nameOf = (entry: SearchEntry) => (entry.kind === "value" ? entry.attribute.value : entry.name);

describe("buildSearchIndex", () => {
  it("lists a show once however many seasons it ran, standing for it by its latest season", () => {
    const { items } = trekIndex();
    const shows = items.filter((entry) => entry.medium === "show");

    expect(shows).toHaveLength(1);
    expect(shows[0].name).toBe("Star Trek: Strange New Worlds");
    expect(shows[0].item.key).toContain("3");
  });

  it("offers a franchise only where some entry does not repeat its name, counted per medium", () => {
    const { franchises } = trekIndex();

    // Chasm City's franchise is Revelation Space, a name no entry repeats; Star Trek has three
    // entries whose names differ. Nothing here names itself.
    expect(franchises.map((entry) => entry.franchise).toSorted()).toEqual(["Revelation Space", "Star Trek"]);
    const startrek = franchises.find((entry) => entry.franchise === "Star Trek")!;
    expect(startrek.counts).toEqual({ game: 1, show: 3, movie: 1 });
    expect(startrek.size).toBe(5);
  });

  it("counts a franchise by the works its view lists, where its size counts the union's entries", () => {
    // The two answer different questions and the box states each where it is used: the reading is
    // worded by what pressing it shows, which collapses three seasons to one show, and `size` is
    // the strip's own count and the ranker's tie-break.
    const [entry] = trekIndex().franchises;

    expect(entry.works).toBe(3);
    expect(entry.size).toBe(5);
  });

  it("drops a franchise whose one work only repeats the name, which is a work naming itself", () => {
    const arrival = library({ movie: [movie({ name: "Arrival", franchise: "Arrival" })] });

    expect(buildSearchIndex(toOmniItems(arrival), arrival).franchises).toEqual([]);
  });

  it("keeps a franchise of one name across two works, a novel and its film being a series", () => {
    const weir = library({
      book: [book({ name: "Project Hail Mary", franchise: "Project Hail Mary" })],
      movie: [movie({ name: "Project Hail Mary", franchise: "Project Hail Mary" })],
    });
    const [entry] = buildSearchIndex(toOmniItems(weir), weir).franchises;

    expect(entry.franchise).toBe("Project Hail Mary");
    expect(entry.works).toBe(2);
  });

  it("indexes the people and places a work is remembered by, per medium", () => {
    const { items } = trekIndex();
    const secondary = Object.fromEntries(items.map((entry) => [entry.medium, entry.secondary]));

    expect(secondary.game).toEqual(["Nintendo EPD", "Nintendo Switch"]);
    expect(secondary.show).toEqual(["Apple TV+", "", "The Cage", ""]);
    expect(secondary.movie).toEqual(["Denis Villeneuve"]);
    expect(secondary.book).toEqual(["Alastair Reynolds", "Revelation Space"]);
  });
});

describe("searchUnion", () => {
  it("answers with the values first, then each medium in the tabs' order, leaving out a group with nothing", () => {
    const groups = searchUnion(trekIndex(), "star");

    expect(groups.map((group) => group.key)).toEqual(["values", "game", "show", "movie"]);
    expect(nameOf(groups[0].hits[0].entry)).toBe("Star Trek");
  });

  it("finds a show by a season's own name", () => {
    const groups = searchUnion(trekIndex(), "cage");

    expect(groups.map((group) => group.key)).toEqual(["show"]);
  });

  it("finds a book by its author", () => {
    // The author is a value the box can shelve as well as a way to the book, so the work's own
    // group is the second.
    const groups = searchUnion(trekIndex(), "reynolds");

    expect(groups.map((group) => group.key)).toEqual(["values", "book"]);
    expect(nameOf(groups[1].hits[0].entry)).toBe("Chasm City");
  });
});

describe("franchiseWorks and franchiseFacts", () => {
  it("lists one card per work, newest first, and keeps a franchise of one work", () => {
    // The show closed in 2022, the game in April 2017 and the film was watched in January 2017.
    const works = franchiseWorks(trek(), "Star Trek", TODAY);

    expect(works.map((work) => work.medium)).toEqual(["show", "game", "movie"]);
    expect(franchiseWorks(trek(), "Revelation Space", TODAY)).toHaveLength(1);
  });

  it("captions a collapsed show by its name and the work's last close, never a season number", () => {
    const [show] = franchiseWorks(trek(), "Star Trek", TODAY);

    expect(workLabels(show)).toEqual([["1 Jun 2022"], ["Star Trek: Strange New Worlds"]]);
  });

  it("captions a work with any entry still open as in progress", () => {
    const items = toOmniItems(
      library({
        game: [videoGame({ franchise: "Zelda", endDate: undefined }), videoGame({ franchise: "Zelda", name: "Tears" })],
      }),
    );
    const [open] = franchiseWorks(items, "Zelda", TODAY).filter((work) => work.name === "Breath of the Wild");

    expect(workLabels(open)[0]).toEqual(["In progress"]);
  });

  it("states the first year, the last close, the floored hours and the media reached", () => {
    const items = trek().filter((item) => item.franchise === "Star Trek");
    const facts = franchiseFacts(items);

    expect(facts.firstYear).toBe(2017);
    expect(facts.last).toBe(YearMonthDay.get(2022, 6, 1));
    expect(facts.media).toBe(3);
    expect(Number.isInteger(facts.hours)).toBe(true);
  });

  it("takes the last close at the end of the range it denotes, so a bare year outlasts a day inside it", () => {
    const items = toOmniItems(
      library({
        game: [videoGame({ franchise: "Trek", startDate: Year.get(2010), endDate: Year.get(2010) })],
        movie: [movie({ franchise: "Trek", startDate: YearMonthDay.get(2010, 1, 5) })],
      }),
    );

    expect(franchiseFacts(items).last).toBe(Year.get(2010));
  });

  it("leaves the last date open while any row of the franchise is", () => {
    const items = toOmniItems(
      library({
        game: [videoGame({ franchise: "Zelda", endDate: undefined }), videoGame({ franchise: "Zelda", name: "Tears" })],
      }),
    );

    expect(franchiseFacts(items).last).toBeUndefined();
  });
});

describe("the palette before anything is typed", () => {
  it("offers the franchises met lately, dropping a group of one work", () => {
    expect(recentFranchises(trek(), TODAY, 5)).toEqual(["Star Trek"]);
  });

  it("opens the strip's scale on the first of January of the earliest year met", () => {
    expect(unionEpoch(trek(), TODAY)).toBe(YearMonthDay.get(2017, 1, 1));
    expect(unionEpoch([], TODAY)).toBe(YearMonthDay.get(2026, 1, 1));
  });
});

describe("buildAttributeIndex", () => {
  it("counts a category's values per medium, and names every tab whose schema holds the category", () => {
    const entries = buildAttributeIndex(trekLibrary());
    const sciFi = entries.find((entry) => entry.category === "genre" && entry.value === "Sci-Fi")!;

    // The show, the film and the book are Sci-Fi; the game is Adventure.
    // Counted in each tab's own rows: one show, not the three seasons the union flattens it to.
    expect(sciFi.counts).toEqual({ show: 1, movie: 1, book: 1 });
    // The tabs a hit can be taken to are read off those counts, so they are the tabs holding a row
    // of it and not every tab whose schema has a genre: Games would otherwise offer a page filtered
    // to nothing. They come in the order the app says the media, which is the order the walk takes.
    expect(Object.keys(sciFi.counts)).toEqual(["show", "movie", "book"]);
  });

  it("offers a category only the tabs that hold it, counted on the medium that answers", () => {
    const platform = buildAttributeIndex(trekLibrary()).find((entry) => entry.category === "platform")!;

    expect(platform.value).toBe("Nintendo Switch");
    expect(Object.keys(platform.counts)).toEqual(["game"]);
  });

  it("leaves the franchise column out: a franchise is a thing the box already answers with", () => {
    expect(buildAttributeIndex(trekLibrary()).some((entry) => entry.category === "franchise")).toBe(false);
  });

  it("indexes the level above a category's values, so a company is a hit setting its platforms", () => {
    const consoles = library({
      game: [
        videoGame({ name: "Tears of the Kingdom", platform: "Nintendo Switch" }),
        videoGame({ name: "Pokémon Platinum", platform: "Nintendo DS" }),
      ],
    });
    const company = buildAttributeIndex(consoles).find((entry) => entry.label === "company")!;

    expect(company.value).toBe("Nintendo");
    // Filed under the category it narrows, not under its own level: a hit is placed and applied by
    // the field a page's schema holds, and the level is only how the values were reached.
    expect(company.category).toBe("platform");
    expect(company.counts.game).toBe(2);
    // What ↵ sets: the platforms under it, which is what its own parent chip selects.
    expect(company.values.game).toEqual(["Nintendo Switch", "Nintendo DS"]);
  });

  it("indexes no group holding one value, that entry being the same rows under a second name", () => {
    const one = library({ game: [videoGame({ name: "Tears of the Kingdom", platform: "Nintendo Switch" })] });

    expect(buildAttributeIndex(one).some((entry) => entry.label === "company")).toBe(false);
  });

  it("keys a group apart from a value of the same name, a company being free to share one", () => {
    const pc = library({
      game: [
        videoGame({ name: "Half-Life", platform: "PC" }),
        videoGame({ name: "Tears of the Kingdom", platform: "Nintendo Switch" }),
        videoGame({ name: "Pokémon Platinum", platform: "Nintendo DS" }),
      ],
    });
    // PC is its own company and its own platform, and the group is pruned as one of a single
    // value — so what is left counts the one PC game and not that game twice.
    const [platform] = buildAttributeIndex(pc).filter((entry) => entry.value === "PC");

    expect(platform.label).toBe("platform");
    expect(platform.counts.game).toBe(1);
  });

  it("groups a certificate on its band, so the two boards' names for one tier are one hit", () => {
    const rated = library({
      movie: [movie({ name: "Blade Runner", certificate: "15" }), movie({ name: "Akira", certificate: "16" })],
    });
    const tiers = buildAttributeIndex(rated).filter((entry) => entry.category === "certificate");

    expect(tiers.map((entry) => entry.value)).toEqual(["15/16"]);
    expect(tiers[0].counts.movie).toBe(2);
    // What the hit sets on the Movies tab: both notations, since the sheet holds each of them.
    expect(tiers[0].values.movie).toEqual(["15", "16"]);
  });
});

describe("buildAttributeIndex over a shelved toggle", () => {
  const animeLibrary = () =>
    library({
      game: [videoGame({ name: "Star Trek: Resurgence", franchise: "Star Trek", hours: 11 })],
      show: [showWithSeasons(3, { name: "Cowboy Bebop", franchise: "Cowboy Bebop", anime: true })],
      movie: [movie({ name: "Akira", franchise: "Akira", anime: true })],
      book: [book()],
    });

  it("folds the two tabs' anime switches into one entry, since both are keyed and worded alike", () => {
    const anime = buildAttributeIndex(animeLibrary()).filter((entry) => entry.category === "anime");

    expect(anime).toHaveLength(1);
    expect(anime[0].value).toBe("Anime");
    // Each tab's own rows: one show, not the three seasons the union flattens it to.
    expect(anime[0].counts).toEqual({ show: 1, movie: 1 });
  });

  it("keeps the split's unmarked half out of the index, so no shelf stands for a whole tab", () => {
    const values = buildAttributeIndex(animeLibrary())
      .filter((entry) => entry.category === "anime")
      .map((entry) => entry.value);

    expect(values).toEqual(["Anime"]);
  });

  it("leaves a toggle that names a page's own noise out of the index entirely", () => {
    const keys = buildAttributeIndex(animeLibrary()).map((entry) => entry.category);

    expect(keys).not.toContain("unconfirmed");
    expect(keys).not.toContain("unscored");
    // The Omnibus keys its medium switches by medium; none is shelved, or a whole tab would be one.
    expect(keys).not.toContain("game");
  });

  it("holds every row the shelved toggle names, across both media that record it", () => {
    const [anime] = buildAttributeIndex(animeLibrary()).filter((entry) => entry.category === "anime");
    const works = attributeWorks(animeLibrary(), anime, TODAY);

    expect(works.map((work) => work.medium).toSorted()).toEqual(["movie", "show"]);
  });
});

describe("attributePlacements and attributeAction", () => {
  const genre = () =>
    buildAttributeIndex(trekLibrary()).find((entry) => entry.category === "genre" && entry.value === "Sci-Fi")!;

  it("puts the tab being read first, as the one a hit filters rather than travels to", () => {
    const placed = attributePlacements(genre(), "shows", ["genre", "network"]);

    expect(placed[0]).toMatchObject({ tab: "shows", here: true });
    expect(placed.slice(1).map((hit) => hit.tab)).toEqual(["movies", "books"]);
    expect(placed.slice(1).every((hit) => !hit.here)).toBe(true);
  });

  it("offers no hit on a page holding the category but none of the value, which would empty it", () => {
    // Games can be narrowed by genre, and no game in this library is Sci-Fi.
    const placed = attributePlacements(genre(), "games", ["genre", "platform"]);

    expect(placed.every((hit) => !hit.here)).toBe(true);
  });

  it("offers no hit on the page being read where that page cannot be narrowed by the category", () => {
    const platform = buildAttributeIndex(trekLibrary()).find((entry) => entry.category === "platform")!;
    const placed = attributePlacements(platform, "shows", ["genre", "network", "type", "franchise"]);

    expect(placed.map((hit) => ({ tab: hit.tab, here: hit.here }))).toEqual([{ tab: "games", here: false }]);
  });

  it("places a hit on a tab that is no medium, whose own values are the ones it states", () => {
    const [placed] = attributePlacements(genre(), "omnibus", ["genre", "franchise"]);

    expect(placed).toMatchObject({ tab: "omnibus", here: true, medium: undefined });
    expect(attributeAction(placed, [])).toEqual({
      type: "updateFilter",
      filter: "genre",
      value: [placed.value],
    });
  });

  it("adds to whatever that tab already holds, and adds nothing it holds already", () => {
    const [placed] = attributePlacements(genre(), "shows", ["genre"]);

    expect(attributeAction(placed, ["Horror"])).toEqual({
      type: "updateFilter",
      filter: "genre",
      value: ["Horror", placed.value],
    });
    expect(attributeAction(placed, [placed.value])).toEqual({
      type: "updateFilter",
      filter: "genre",
      value: [placed.value],
    });
  });

  it("sets both of a band's notations on a tab whose rows carry each of them", () => {
    const rated = library({
      movie: [movie({ name: "Blade Runner", certificate: "15" }), movie({ name: "Akira", certificate: "16" })],
    });
    const tier = buildAttributeIndex(rated).find((entry) => entry.category === "certificate")!;
    const [placed] = attributePlacements(tier, "movies", ["genre", "certificate"]);

    expect(attributeAction(placed, [])).toEqual({
      type: "updateFilter",
      filter: "certificate",
      value: ["15", "16"],
    });
  });

  it("sets each board's own number, one tier being written as a 15 here and a 16 there", () => {
    // The two boards part in the middle: BBFC issues a 15 where PEGI issues a 16, and the sheets
    // write whichever their own board does. One hit on the tier has to land as the number the tab
    // it is pressed on actually holds, or it narrows that page to nothing.
    const rated = library({
      game: [videoGame({ name: "The Witcher 3", certificate: "16" })],
      movie: [movie({ name: "Blade Runner", certificate: "15" })],
    });
    const tier = buildAttributeIndex(rated).find((entry) => entry.category === "certificate")!;

    expect(tier.value).toBe("15/16");
    const onGames = attributePlacements(tier, "games", ["certificate"])[0];
    const onMovies = attributePlacements(tier, "movies", ["certificate"])[0];

    expect(attributeAction(onGames, [])).toMatchObject({ filter: "certificate", value: ["16"] });
    expect(attributeAction(onMovies, [])).toMatchObject({ filter: "certificate", value: ["15"] });
  });

  it("sets the band itself on the tab that is no medium, which has no board of its own", () => {
    const rated = library({
      game: [videoGame({ name: "The Witcher 3", certificate: "16" })],
      movie: [movie({ name: "Blade Runner", certificate: "15" })],
    });
    const tier = buildAttributeIndex(rated).find((entry) => entry.category === "certificate")!;
    const [placed] = attributePlacements(tier, "omnibus", ["certificate"]);

    // Its own category groups on the band for the same reason the gallery's shelves do, so the
    // band string is the value that page can actually be narrowed by.
    expect(attributeAction(placed, [])).toMatchObject({ filter: "certificate", value: ["15/16"] });
  });
});

describe("searchUnion over values", () => {
  it("puts the page being read first among a value's narrowings, then the pages it travels to", () => {
    const [value] = valuesOf(searchUnion(trekIndex(), "sci-fi", { tabId: "shows", categories: ["genre", "network"] }));

    expect(value.attribute.value).toBe("Sci-Fi");
    // The tab being read leads and is the one narrowed in place; the rest are places to go.
    expect(value.placements.map((placed) => placed.tab)).toEqual(["shows", "movies", "books"]);
    expect(value.placements.map((placed) => placed.here)).toEqual([true, false, false]);
  });

  it("keeps a value with no page to narrow, which still has a layer to open", () => {
    // The layer reading is over the libraries recording the value and asks no tab anything, where
    // a narrowing needs a page to narrow. Nothing in the four libraries is *named* "Sci-Fi", so
    // the value and its one reading are the whole answer.
    const groups = searchUnion(trekIndex(), "sci-fi");
    const [value] = valuesOf(groups);

    expect(groups.map((group) => group.key)).toEqual(["values"]);
    expect(value.attribute.value).toBe("Sci-Fi");
    expect(value.placements).toEqual([]);
  });

  it("leads with the values, then the works", () => {
    const groups = searchUnion(trekIndex(), "star", { tabId: "shows", categories: ["genre", "franchise"] });

    expect(groups.map((group) => group.key)).toEqual(["values", "game", "show", "movie"]);
  });

  it("carries the series behind a value, which is what its layer reading opens", () => {
    // A series opens its own view — its facts and its strip before the works — where an attribute
    // opens a shelf of works alone, so the two are told apart by whether an entry stands behind
    // the value rather than by which list it came from.
    const values = valuesOf(searchUnion(trekIndex(), "star trek", { tabId: "shows", categories: ["genre"] }));

    expect(values[0].franchise?.franchise).toBe("Star Trek");
    expect(values[0].attribute.category).toBe("franchise");
  });

  it("puts the attribute above the series where the value is named exactly and the series is not", () => {
    // Both answer, so which leads is how well each did: the genre is the query exactly, where
    // Fantasy Quest holds it at a word start.
    const fantasy = library({
      game: [videoGame({ name: "Fantasy Quest II", franchise: "Fantasy Quest", genre: "Fantasy" })],
      movie: [movie({ name: "Fantasy Quest: The Film", franchise: "Fantasy Quest", genre: "Fantasy" })],
    });
    const values = valuesOf(
      searchUnion(buildSearchIndex(toOmniItems(fantasy), fantasy), "fantasy", {
        tabId: "games",
        categories: ["genre", "franchise"],
      }),
    );

    expect(values.map((value) => value.attribute.value)).toEqual(["Fantasy", "Fantasy Quest"]);
    expect(values[0].franchise).toBeUndefined();
  });

  it("puts the series above the attribute where it answers at least as well", () => {
    // A series and a Books series column can name one thing — Revelation Space is the franchise
    // column and the series column both — so a tie is the common case rather than the odd one, and
    // the series takes it: its view states the series' own facts and strip before listing it.
    const reynolds = library({ book: [book(), book({ name: "Redemption Ark", seriesNumber: 3 })] });
    const values = valuesOf(
      searchUnion(buildSearchIndex(toOmniItems(reynolds), reynolds), "revelation space", {
        tabId: "books",
        categories: ["series", "franchise"],
      }),
    );

    expect(values.map((value) => value.franchise !== undefined)).toEqual([true, false]);
  });

  it("counts a value's narrowings in the tab's own rows, where the series counts the union's", () => {
    // The two figures answer different questions and the box states them on one line apiece: the
    // value's own line is worded in the union's unit — three seasons — and each reading in the
    // tab's own noun, where a show is one show and pressing it leaves one row on the page.
    const [value] = valuesOf(
      searchUnion(trekIndex(), "star trek", { tabId: "shows", categories: ["genre", "franchise"] }),
    );

    expect(value.placements[0].counts).toEqual({ game: 1, show: 1, movie: 1 });
    expect(value.franchise?.counts).toEqual({ game: 1, show: 3, movie: 1 });
  });

  it("offers no narrowing on a tab whose own picker erases the franchise", () => {
    // `isSeries` runs over the union, so a franchise crossing two media is a series even where one
    // tab's only row names itself — and that tab's own `franchiseOptions` drops it. Placed there,
    // the filter would be set with no chip offering or clearing it, and swept away silently by
    // `retainPageSelections` on the next library landing.
    const halo = library({
      game: [videoGame({ name: "Halo", franchise: "Halo" })],
      movie: [movie({ name: "Halo: The Movie", franchise: "Halo" })],
    });
    const [value] = valuesOf(
      searchUnion(buildSearchIndex(toOmniItems(halo), halo), "halo", {
        tabId: "movies",
        categories: ["genre", "franchise"],
      }),
    );

    // Movies names the series; the lone Halo game names only itself, so Games offers no chip.
    expect(value.placements.map((placed) => placed.tab)).toEqual(["movies"]);
  });

  it("states how many values the query matched, not how many it showed", () => {
    // The figure the header turns into "2 of 8" and the only thing saying there is more behind the
    // rows. Ranked half a list at a time and cut before the merge, the total could never exceed
    // the cut, and a query the series answered better would drop attributes the group had room
    // for.
    const noirs = library({
      movie: ["Noir One", "Noir Two", "Noir Three", "Noir Four"].map((genre, index) =>
        movie({ name: `Film ${index}`, franchise: `Noir ${index}`, genre }),
      ),
    });
    const groups = searchUnion(buildSearchIndex(toOmniItems(noirs), noirs), "noir", undefined, 2);
    const values = groups.find((group) => group.key === "values")!;

    // Four genres and four series, of which two are shown.
    expect(values.hits).toHaveLength(2);
    expect(values.total).toBe(8);
  });

  it("ranks a series against the attributes it stands beside rather than after them", () => {
    // One place to be narrowed by, and the series answers the query exactly where the genres hold
    // it inside a word: concatenated, the genres would fill the cut and the series a reader typed
    // the name of would fall out of the group.
    const noir = library({
      movie: [
        movie({ name: "Noir", franchise: "Noir", genre: "Anoir" }),
        movie({ name: "Noir II", franchise: "Noir", genre: "Bnoir" }),
        movie({ name: "Noir III", franchise: "Noir", genre: "Cnoir" }),
      ],
    });
    const values = valuesOf(
      searchUnion(buildSearchIndex(toOmniItems(noir), noir), "noir", {
        tabId: "movies",
        categories: ["genre", "franchise"],
      }),
    );

    expect(values[0].attribute.category).toBe("franchise");
  });

  it("gives a series the two narrowings a genre gets, on the tabs recording it", () => {
    const [value] = valuesOf(
      searchUnion(trekIndex(), "star trek", { tabId: "shows", categories: ["genre", "franchise"] }),
    );

    expect(value.attribute.category).toBe("franchise");
    expect(value.placements.map((placed) => placed.tab)).toEqual(["shows", "games", "movies"]);
    expect(value.placements.map((placed) => placed.here)).toEqual([true, false, false]);
  });

  it("sets the franchise column on the tab a narrowing was pressed on", () => {
    const [value] = valuesOf(searchUnion(trekIndex(), "star trek", { tabId: "shows", categories: ["franchise"] }));

    expect(attributeAction(value.placements[0], [])).toEqual({
      type: "updateFilter",
      filter: "franchise",
      value: ["Star Trek"],
    });
  });

  it("offers no narrowing of the page being read where its schema has no franchise category", () => {
    const [value] = valuesOf(searchUnion(trekIndex(), "star trek", { tabId: "shows", categories: ["genre"] }));

    expect(value.placements.some((placed) => placed.here)).toBe(false);
  });
});

describe("the categories a query can name", () => {
  const index = () => {
    const held = trekLibrary();
    return buildSearchIndex(toOmniItems(held), held);
  };

  it("folds a category recorded by more than one tab into one entry, counted over its values", () => {
    const genre = index().categories.filter((entry) => entry.category === "genre");

    expect(genre).toHaveLength(1);
    // Sci-Fi from the show, the film and the book; Adventure from the game.
    expect(genre[0].size).toBe(2);
    // What it matches on is the label, so the entry is found by naming the category and nothing else.
    expect(genre[0].name).toBe("genre");
  });

  it("counts a category's values and not the levels above them, so its figure matches its rows", () => {
    const consoles = library({
      game: [
        videoGame({ name: "Tears of the Kingdom", platform: "Nintendo Switch" }),
        videoGame({ name: "Pokémon Platinum", platform: "Nintendo DS" }),
      ],
    });
    const built = buildSearchIndex(toOmniItems(consoles), consoles);
    const platform = built.categories.find((entry) => entry.category === "platform")!;

    // Two platforms under a Nintendo entry the index also holds — three entries, two values.
    expect(built.attributes.filter((entry) => entry.category === "platform")).toHaveLength(3);
    expect(platform.size).toBe(2);
  });

  it("drops a category of one findable value, that row and its value's being the same row twice", () => {
    // The anime split offers its marked half alone, so naming the category and naming the value
    // would put one narrowing on the list under two names.
    expect(index().categories.map((entry) => entry.category)).not.toContain("anime");
  });

  it("counts the franchise category off the franchise index, its values being absent from the other", () => {
    const built = index();
    const franchise = built.categories.find((entry) => entry.category === "franchise")!;

    expect(built.attributes.some((entry) => entry.category === "franchise")).toBe(false);
    expect(franchise.size).toBe(built.franchises.length);
  });
});

describe("the categories a query narrows to", () => {
  // The row itself is drawn by the box, which narrows it in place exactly as it narrows the tabs';
  // what is testable here is the ranking beneath it, which is the whole of what the row shows.
  const named = (query: string) => {
    const built = trekIndex();
    return rankHits(built.categories, query, built.categories.length).hits.map((hit) => hit.entry.category);
  };

  it("answers a category named outright", () => {
    expect(named("genre")).toEqual(["genre"]);
  });

  it("answers a word start, so half a category's name is enough to reach it", () => {
    expect(named("gen")).toEqual(["genre"]);
  });

  it("answers a bare substring too, a chip row narrowing in place costing what one chip costs", () => {
    // "at" starts none of them and is inside certificate — and, over the real library, inside
    // platform and format too. As a section of rows those would have buried the values a reader was
    // actually after; as chips they are the row answering, and the tabs' own line has always been
    // found the same way.
    expect(named("at")).toContain("certificate");
  });

  it("answers nothing where the query names no category, so the row goes rather than standing empty", () => {
    expect(named("zzz")).toEqual([]);
  });
});

describe("searchScope", () => {
  const held = () => {
    const rows = trekLibrary();
    return { index: buildSearchIndex(toOmniItems(rows), rows) };
  };

  it("lists every value of the category, biggest first, where the vocabulary fits the cut", () => {
    const [group] = searchScope(held().index, "genre", "");

    expect(group.hits).toHaveLength(2);
    expect(group.total).toBe(2);
    // Sci-Fi holds three rows to Adventure's one.
    expect(group.hits.map((hit) => (hit.entry as ValueSearchEntry).attribute.value)).toEqual(["Sci-Fi", "Adventure"]);
  });

  it("narrows to what the query matches, counted in matches as every other group is", () => {
    const [group] = searchScope(held().index, "genre", "adv");

    expect(group.hits.map((hit) => (hit.entry as ValueSearchEntry).attribute.value)).toEqual(["Adventure"]);
    // The header reads `cut(shown, total)`, so a total of the whole vocabulary would claim the
    // other eleven genres are behind this one and reachable by scrolling.
    expect(group.total).toBe(1);
  });

  it("answers with no group where the query matches nothing, rather than a header over the empty state", () => {
    expect(searchScope(held().index, "genre", "zzz")).toEqual([]);
  });

  it("lists the franchise index for the franchise category, whose values the other one skips", () => {
    const [group] = searchScope(held().index, "franchise", "");

    expect(group.hits.map((hit) => (hit.entry as ValueSearchEntry).franchise?.franchise)).toEqual([
      "Star Trek",
      "Revelation Space",
    ]);
  });

  it("answers nothing for a category the index does not hold", () => {
    expect(searchScope(held().index, "gameplay", "")).toEqual([]);
  });

  it("cuts a vocabulary too long to scan, the header stating what it held back", () => {
    // A phone book drawn out rather than described: the six vocabularies past sixty are the ones
    // the scope's own field exists for, and the header says so in the app's own sentence.
    const many = library({
      movie: Array.from({ length: SCOPE_ROWS + 12 }, (_, index) =>
        movie({ name: `Film ${index}`, director: `Director ${index}` }),
      ),
    });
    const [group] = searchScope(buildSearchIndex(toOmniItems(many), many), "director", "");

    expect(group.hits).toHaveLength(SCOPE_ROWS);
    expect(group.total).toBe(SCOPE_ROWS + 12);
  });

  it("cuts a narrowed list at the same figure, so typing can never draw more than a browse", () => {
    const many = library({
      movie: Array.from({ length: SCOPE_ROWS + 12 }, (_, index) =>
        movie({ name: `Film ${index}`, director: `Director ${index}` }),
      ),
    });
    const [group] = searchScope(buildSearchIndex(toOmniItems(many), many), "director", "director");

    expect(group.hits).toHaveLength(SCOPE_ROWS);
  });
});

describe("attributeWorks", () => {
  it("collapses the whole union's rows carrying one attribute into a card apiece", () => {
    const sciFi = buildAttributeIndex(trekLibrary()).find(
      (entry) => entry.category === "genre" && entry.value === "Sci-Fi",
    )!;
    const works = attributeWorks(trekLibrary(), sciFi, TODAY);

    // The three seasons are one show; the film and the book stand beside it, newest first.
    expect(works.map((work) => work.medium)).toEqual(["book", "show", "movie"]);
  });

  it("shelves the rows a hit sets, so an entry standing for a set of cells shelves all of them", () => {
    const consoles = library({
      game: [
        videoGame({ name: "Tears of the Kingdom", platform: "Nintendo Switch" }),
        videoGame({ name: "Pokémon Platinum", platform: "Nintendo DS" }),
        videoGame({ name: "Half-Life", platform: "PC" }),
      ],
    });
    const company = buildAttributeIndex(consoles).find((entry) => entry.label === "company")!;

    // Read the other way — the cell put back through the value rule and compared to "Nintendo" —
    // this shelves nothing, a company being no platform any row carries.
    expect(
      attributeWorks(consoles, company, TODAY)
        .map((work) => work.name)
        .toSorted(),
    ).toEqual(["Pokémon Platinum", "Tears of the Kingdom"]);
  });
});
