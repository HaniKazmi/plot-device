import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { finishedItems } from "../../src/common/finishedData";

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
