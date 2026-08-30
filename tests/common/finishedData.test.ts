import { describe, expect, it } from "vitest";
import { Year, YearMonthDay } from "../../src/common/date";
import { bucketLabel, finishedBucket, finishedItems, orderedBuckets } from "../../src/common/finishedData";

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
  it("keeps wall order rather than sorting, so a rail's highlight only ever travels one way", () => {
    expect(orderedBuckets(["2024", "2024", "2023", "2021"])).toEqual(["2024", "2023", "2021"]);
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
