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
  startDate: year === undefined ? undefined : YearMonthDay.get(year, 1, 1),
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

  it("does not sort at all under Name, leaving the data in sheet order", () => {
    // There is no branch for "Name". The option looks like it works only because the
    // spreadsheets are maintained roughly alphabetically.
    const data = [item("Zelda", "a.jpg", 2020), item("Animal Crossing", "b.jpg", 2021)];

    expect(finishedItems(data, "Name").map((i) => i.name)).toEqual(["Zelda", "Animal Crossing"]);
  });

  it("still filters by artwork under Name", () => {
    const data = [item("with", "a.jpg"), item("without", undefined)];

    expect(finishedItems(data, "Name").map((i) => i.name)).toEqual(["with"]);
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
    const yearOnly = { name: "Old", banner: "a.jpg", startDate: Year.get(2007) };

    expect(finishedBucket(yearOnly, "Date")).toBe("2007");
    expect(finishedBucket(item("New", "a.jpg", 2007), "Date")).toBe("2007");
  });

  it("has no bucket for an undated item, which is one the date sort puts first", () => {
    expect(finishedBucket(item("Undated", "a.jpg"), "Date")).toBeNull();
  });

  it("reads a leading letter off the name under the name sort", () => {
    expect(finishedBucket(item("Metroid", "a.jpg", 2023), "Name")).toBe("M");
  });

  it("uppercases a lowercase leading letter, so one section has one label", () => {
    expect(finishedBucket(item("iO", "a.jpg"), "Name")).toBe("I");
  });

  it("keeps a leading digit or symbol as itself rather than dropping it", () => {
    expect(finishedBucket(item("1080 Snowboarding", "a.jpg"), "Name")).toBe("1");
  });

  it("has no bucket for an empty name, which has no letter to show", () => {
    expect(finishedBucket(item("", "a.jpg"), "Name")).toBeNull();
  });

  it("ignores the field the other sort would have read", () => {
    // The bucket follows the sort, so the same item answers differently under each.
    const both = item("Metroid", "a.jpg", 2023);

    expect(finishedBucket(both, "Date")).toBe("2023");
    expect(finishedBucket(both, "Name")).toBe("M");
  });
});

describe("orderedBuckets", () => {
  it("keeps wall order rather than sorting, deduped to each bucket's first appearance", () => {
    expect(orderedBuckets(["2024", "2024", "2023", "2021"])).toEqual(["2024", "2023", "2021"]);
  });

  it("collapses a run of one bucket to a single entry, which is every year under the date sort", () => {
    // A year's cards are contiguous and the year does not return, so the date sort's buckets come
    // out strictly descending and a rail's highlight travels one way down them. The name sort has
    // no such guarantee — see below.
    expect(orderedBuckets(["2024", "2023", "2023", "2022"])).toEqual(["2024", "2023", "2022"]);
  });

  it("holds a bucket at its first appearance when the wall returns to it later", () => {
    // The name sort groups by franchise, so one letter can open the wall and reappear far down it.
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
    expect(finishedKey({ name: "Severance", banner: "a.jpg" })).toBe("Severance");
  });

  it("reads a year-only release date, which games record", () => {
    expect(finishedKey({ name: "Ocarina of Time", banner: "a.jpg", releaseDate: Year.get(1998) })).toBe(
      "Ocarina of Time (1998)",
    );
  });
});
