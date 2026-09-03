import { describe, expect, it } from "vitest";
import { Year, YearMonthDay } from "../../src/common/date";
import {
  bucketLabel,
  finishedBucket,
  finishedColumns,
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

describe("finishedColumns", () => {
  const BREAKPOINTS = ["xs", "sm", "md", "lg", "xl"] as const;

  /**
   * What Grid actually applies at each width. A size object states a value only where the count
   * changes and MUI carries the last one upward, so a table naming no `xl` is still answering
   * there — and a comparison that read the objects key by key would compare a number against
   * nothing.
   */
  const resolved = (columns: ReturnType<typeof finishedColumns>): number[] => {
    let carried = 12;
    return BREAKPOINTS.map((breakpoint) => {
      carried = columns[breakpoint] ?? carried;
      return carried;
    });
  };

  it("gives a banner two to a row on a phone and five at the widest, compact", () => {
    // Two is the floor: at 390px each card is about 190px, where three is 95px and the title
    // drawn into the artwork stops being readable.
    expect(resolved(finishedColumns(true, "Compact"))).toEqual([6, 4, 3, 12 / 5, 2]);
  });

  it("gives a banner the whole width on a phone and four to a row above, large", () => {
    expect(resolved(finishedColumns(true, "Large"))).toEqual([12, 6, 4, 4, 4]);
  });

  it("steps a poster one card denser than a banner at every width", () => {
    // Portrait artwork is two thirds as wide as it is tall against a banner's sixteen ninths, so
    // one more to the row is what holds the two walls to comparable heights.
    for (const density of ["Compact", "Large"] as const) {
      const banners = resolved(finishedColumns(true, density));
      const posters = resolved(finishedColumns(false, density));

      posters.forEach((poster, index) => expect(poster).toBeLessThan(banners[index]));
    }
  });

  it("never draws a compact card wider than a large one, at any width or either shape", () => {
    // The two densities are a floor and a ceiling on one wall rather than two independent
    // layouts: the toggle only ever adds size, whichever width the reader is at.
    for (const landscape of [true, false]) {
      const compact = resolved(finishedColumns(landscape, "Compact"));
      const large = resolved(finishedColumns(landscape, "Large"));

      compact.forEach((columns, index) => expect(columns).toBeLessThanOrEqual(large[index]));
    }
  });

  it("fills every row with a whole number of cards, so no row ends in a part card", () => {
    // A fractional size is fine — Grid resolves one as `calc(100% * size / columns)` — but a
    // count that does not divide twelve leaves a gap the width of the remainder on every row.
    // Compared with a tolerance because a twelfth of five is not exact in binary.
    for (const landscape of [true, false]) {
      for (const density of ["Compact", "Large"] as const) {
        for (const columns of resolved(finishedColumns(landscape, density))) {
          expect(12 / columns).toBeCloseTo(Math.round(12 / columns), 10);
        }
      }
    }
  });
});

describe("a caller's own sort", () => {
  const scored = (name: string, score: number | undefined, year: number) => ({ ...item(name, "a.jpg", year), score });
  const byScore = [{ label: "Score", value: (entry: { score?: number }) => entry.score }];

  it("orders highest first, breaking a tie by the newer date", () => {
    const items = [scored("old nine", 9, 2010), scored("seven", 7, 2020), scored("new nine", 9, 2024)];
    expect(finishedItems(items, "Score", byScore).map((entry) => entry.name)).toEqual([
      "new nine",
      "old nine",
      "seven",
    ]);
  });

  it("puts an item with no figure last rather than first, and keeps a figure of zero in its place", () => {
    const items = [scored("unscored", undefined, 2024), scored("zero", 0, 2020), scored("five", 5, 2018)];
    expect(finishedItems(items, "Score", byScore).map((entry) => entry.name)).toEqual(["five", "zero", "unscored"]);
  });

  it("still filters by artwork", () => {
    const items = [scored("shown", 8, 2020), { ...scored("hidden", 9, 2021), banner: undefined }];
    expect(finishedItems(items, "Score", byScore).map((entry) => entry.name)).toEqual(["shown"]);
  });

  it("buckets on the figure itself unless the sort names a coarser bucket", () => {
    expect(finishedBucket(scored("nine", 9, 2020), "Score", byScore)).toBe("9");
    expect(finishedBucket(scored("unscored", undefined, 2020), "Score", byScore)).toBeNull();
    const byPages = [
      {
        label: "Pages",
        value: (entry: { score?: number }) => entry.score,
        bucket: (v: number) => `${Math.floor(v / 100) * 100}+`,
      },
    ];
    expect(finishedBucket(scored("long", 772, 2020), "Pages", byPages)).toBe("700+");
  });

  it("falls through to the built-in orders when the sort is not one of the caller's", () => {
    const items = [scored("a", 1, 2010), scored("b", 2, 2020)];
    expect(finishedItems(items, "Date", byScore).map((entry) => entry.name)).toEqual(["b", "a"]);
  });
});
