import { describe, expect, it } from "vitest";
import { Year, YearMonthDay } from "../../src/common/date";
import {
  bucketLabel,
  finishedBucket,
  finishedCount,
  finishedItems,
  finishedKey,
  orderedBuckets,
} from "../../src/common/finishedData";

const item = (name: string, banner: string | undefined, year?: number) => ({
  name,
  banner,
  franchise: "",
  startDate: year === undefined ? undefined : YearMonthDay.get(year, 1, 1),
});

/** A work in a series, for the franchise sort: its own title, its series, and when it came out. */
const entry = (name: string, franchise: string, release?: number, start?: number) => ({
  name,
  franchise,
  banner: "a.jpg",
  releaseDate: release === undefined ? undefined : YearMonthDay.get(release, 1, 1),
  startDate: start === undefined ? undefined : YearMonthDay.get(start, 1, 1),
});

describe("finishedItems", () => {
  it("keeps only items that have artwork, since the grid is all pictures", () => {
    const data = [item("with", "a.jpg", 2020), item("without", undefined, 2021)];

    expect(finishedItems(data, "Date").map((i) => i.name)).toEqual(["with"]);
  });

  it("treats an empty banner string as no artwork", () => {
    expect(finishedItems([item("blank", "", 2020)], "Date")).toEqual([]);
  });

  it("orders by date, newest first", () => {
    const data = [item("old", "a.jpg", 2018), item("new", "b.jpg", 2024), item("mid", "c.jpg", 2021)];

    expect(finishedItems(data, "Date").map((i) => i.name)).toEqual(["new", "mid", "old"]);
  });

  it("puts items with no date at the front of the date sort", () => {
    // sortByKey short-circuits on a falsy key before comparing, so an undefined date leads
    // regardless of direction.
    const data = [item("dated", "a.jpg", 2020), item("undated", "b.jpg")];

    expect(finishedItems(data, "Date").map((i) => i.name)).toEqual(["undated", "dated"]);
  });

  it("gathers a series together and walks it in release order", () => {
    const data = [entry("Echoes", "Metroid", 2004), entry("Breath", "Zelda", 2017), entry("Prime", "Metroid", 2002)];

    expect(finishedItems(data, "Franchise").map((i) => i.name)).toEqual(["Prime", "Echoes", "Breath"]);
  });

  it("orders a series by release rather than by when the reader met it", () => {
    // A series has an order of its own, and the order it was watched in is not it: a reader who
    // came to a trilogy at its third film would otherwise see that film lead the shelf.
    const data = [entry("First", "Saga", 1977, 2020), entry("Second", "Saga", 1980, 2001)];

    expect(finishedItems(data, "Franchise").map((i) => i.name)).toEqual(["First", "Second"]);
  });

  it("falls through to the start date where nothing carries a release, which is a Shows wall", () => {
    const data = [entry("S2", "Severance", undefined, 2025), entry("S1", "Severance", undefined, 2022)];

    expect(finishedItems(data, "Franchise").map((i) => i.name)).toEqual(["S1", "S2"]);
  });

  it("sorts a work with no franchise under its own title, not under the empty string", () => {
    // Every sheet leaves a standalone work naming itself, so a blank cell is the one case where
    // the title is what the column would have held. Collecting blanks under "" instead would put
    // every unaffiliated work in one block at the front of the wall.
    const data = [entry("Braid", "", 2008), entry("Prime", "Metroid", 2002), entry("Alan Wake", "", 2010)];

    expect(finishedItems(data, "Franchise").map((i) => i.name)).toEqual(["Alan Wake", "Braid", "Prime"]);
  });

  it("reads a whitespace-only franchise cell as blank, not as a series called space", () => {
    // Untrimmed it sorts ahead of every letter and gives the jump rail a chip with nothing on it.
    const data = [entry("Braid", " ", 2008), entry("Alan Wake", "", 2010)];

    expect(finishedItems(data, "Franchise").map((i) => i.name)).toEqual(["Alan Wake", "Braid"]);
  });

  it("still filters by artwork under the franchise sort", () => {
    const data = [item("with", "a.jpg"), item("without", undefined)];

    expect(finishedItems(data, "Franchise").map((i) => i.name)).toEqual(["with"]);
  });

  it("leaves the caller's array untouched", () => {
    const data = [item("old", "a.jpg", 2018), item("new", "b.jpg", 2024)];
    finishedItems(data, "Date");

    expect(data.map((i) => i.name)).toEqual(["old", "new"]);
  });

  it("returns nothing for empty data", () => {
    expect(finishedItems([], "Date")).toEqual([]);
  });
});

describe("finishedCount", () => {
  it("counts the population the grid renders rather than the data handed in", () => {
    const data = [item("with", "a.jpg", 2020), item("blank", "", 2021), item("without", undefined, 2022)];

    expect(finishedCount(data)).toBe(1);
    expect(finishedCount(data)).toBe(finishedItems(data, "Date").length);
  });
});

describe("finishedBucket", () => {
  it("reads a year off the date under the date sort", () => {
    expect(finishedBucket(item("Zelda", "a.jpg", 2023), "Date")).toBe("2023");
  });

  it("gives a year-only date the same year a full date gives", () => {
    const yearOnly = { name: "Old", banner: "a.jpg", franchise: "", startDate: Year.get(2007) };

    expect(finishedBucket(yearOnly, "Date")).toBe("2007");
    expect(finishedBucket(item("New", "a.jpg", 2007), "Date")).toBe("2007");
  });

  it("has no bucket for an undated item, which is one the date sort puts first", () => {
    expect(finishedBucket(item("Undated", "a.jpg"), "Date")).toBeNull();
  });

  it("reads a leading letter off the franchise under the franchise sort", () => {
    // The franchise and not the title, or an entry would light a chip beside the run it sits in:
    // "Breath of the Wild" sorts under Zelda and would otherwise label itself B.
    expect(finishedBucket(entry("Breath of the Wild", "Zelda", 2017), "Franchise")).toBe("Z");
  });

  it("falls back to the title where no franchise is recorded, as the sort does", () => {
    expect(finishedBucket(entry("Braid", "", 2008), "Franchise")).toBe("B");
  });

  it("uppercases a lowercase leading letter, so one section has one label", () => {
    expect(finishedBucket(entry("iO", "", 2013), "Franchise")).toBe("I");
  });

  it("keeps a leading digit or symbol as itself rather than dropping it", () => {
    expect(finishedBucket(entry("1080 Snowboarding", "", 1998), "Franchise")).toBe("1");
  });

  it("has no bucket where neither franchise nor title has a letter to show", () => {
    expect(finishedBucket(item("", "a.jpg"), "Franchise")).toBeNull();
  });

  it("ignores the field the other sort would have read", () => {
    // The bucket follows the sort, so the same item answers differently under each.
    const both = { ...item("Metroid Prime", "a.jpg", 2023), franchise: "Metroid" };

    expect(finishedBucket(both, "Date")).toBe("2023");
    expect(finishedBucket(both, "Franchise")).toBe("M");
  });
});

describe("orderedBuckets", () => {
  it("keeps wall order rather than sorting, deduped to each bucket's first appearance", () => {
    expect(orderedBuckets(["2024", "2024", "2023", "2021"])).toEqual(["2024", "2023", "2021"]);
  });

  it("collapses a run of one bucket to a single entry, which is what both sorts produce", () => {
    // Each sort's key opens a bucket once — a year is unique, and franchise-ordered initials are
    // non-decreasing — so a rail's highlight travels one way down the page under either.
    expect(orderedBuckets(["2024", "2023", "2023", "2022"])).toEqual(["2024", "2023", "2022"]);
  });

  it("holds a bucket at its first appearance when the wall returns to it later", () => {
    // Neither sort produces this today. It is what keeps the rail's labels unique, and so what a
    // key that did return to a value it had passed would still be held together by.
    expect(orderedBuckets(["Z", "A", "Z", "B"])).toEqual(["Z", "A", "B"]);
  });

  it("contributes nothing for a card with no bucket, which carries no attribute at all", () => {
    expect(orderedBuckets(["2024", undefined, null, "", "2023"])).toEqual(["2024", "2023"]);
  });
});

describe("bucketLabel", () => {
  it("shortens a year to two digits, since the rail is one chip wide", () => {
    expect(bucketLabel("2024")).toBe("\u201924");
  });

  it("shows anything that is not a year as itself", () => {
    expect(bucketLabel("M")).toBe("M");
    expect(bucketLabel("1")).toBe("1");
  });
});

describe("finishedKey", () => {
  const released = (name: string, year: number) => ({
    name,
    banner: "a.jpg",
    franchise: "",
    startDate: YearMonthDay.get(2020, 1, 1),
    releaseDate: YearMonthDay.get(year, 1, 1),
  });

  it("tells a remake apart from the film it remakes", () => {
    // Three pairs on the movies wall share a title exactly. Keyed on the name alone React cannot
    // tell the two cards apart and may render one of the pair in place of the other.
    expect(finishedKey(released("The Lion King", 1994))).not.toBe(finishedKey(released("The Lion King", 2019)));
  });

  it("names the year a reader would disambiguate by", () => {
    expect(finishedKey(released("Rebecca", 1940))).toBe("Rebecca (1940)");
  });

  it("does not move when the watching does", () => {
    // Watching something again rewrites its watch date. A key built on that would change with it,
    // remounting the card and dropping the colour extracted from its artwork.
    const first = { ...released("Peter Pan", 1953), startDate: YearMonthDay.get(2002, 9, 11) };
    const rewatched = { ...first, startDate: YearMonthDay.get(2024, 3, 1) };

    expect(finishedKey(rewatched)).toBe(finishedKey(first));
  });

  it("falls back to the bare name where a domain dates only the watching", () => {
    // Shows carry no release date, and no two shows on record share a title.
    expect(finishedKey({ name: "Severance", banner: "a.jpg", franchise: "" })).toBe("Severance");
  });

  it("reads a year-only release date, which games record", () => {
    expect(
      finishedKey({ name: "Ocarina of Time", banner: "a.jpg", franchise: "Zelda", releaseDate: Year.get(1998) }),
    ).toBe("Ocarina of Time (1998)");
  });
});
