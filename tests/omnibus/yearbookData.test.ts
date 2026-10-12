import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { toOmniItems } from "../../src/app/library";
import { yearbook } from "../../src/omnibus/yearbookData";
import { book } from "../fixtures/books";
import { videoGame } from "../fixtures/gameRows";
import { library } from "../fixtures/library";
import { movie } from "../fixtures/movies";

const day = (year: number, month: number, date: number) => YearMonthDay.get(year, month, date);

describe("yearbook", () => {
  it("runs newest year first, each year holding the items it counts", () => {
    const years = yearbook(
      toOmniItems(
        library({
          game: [
            videoGame({ name: "Old", startDate: day(2015, 1, 1), endDate: day(2015, 2, 1) }),
            videoGame({ name: "New", startDate: day(2020, 1, 1), endDate: day(2020, 2, 1) }),
          ],
          movie: [movie({ name: "Film", startDate: day(2020, 6, 1) })],
        }),
      ),
    );

    expect(years.map((year) => year.year)).toEqual([2020, 2015]);
    expect(years[0].items.map((item) => item.name).toSorted()).toEqual(["Film", "New"]);
  });

  it("stands a year for the work given the most time in each medium, in the page's medium order", () => {
    const [year] = yearbook(
      toOmniItems(
        library({
          book: [book({ name: "A Book", startDate: day(2020, 3, 1), endDate: day(2020, 3, 9) })],
          game: [
            videoGame({ name: "Short", hours: 10, startDate: day(2020, 1, 1), endDate: day(2020, 2, 1) }),
            videoGame({ name: "Long", hours: 90, startDate: day(2020, 3, 1), endDate: day(2020, 6, 1) }),
          ],
        }),
      ),
    );

    expect(year.headliners.map((item) => item.name)).toEqual(["Long", "A Book"]);
  });

  it("stands a year's films for its best-scored, a film's hours being only its runtime", () => {
    const [year] = yearbook(
      toOmniItems(
        library({
          movie: [
            movie({ name: "Epic", minutes: 200, score: 5, startDate: day(2020, 1, 1) }),
            movie({ name: "Gem", minutes: 90, score: 9, startDate: day(2020, 2, 1) }),
            movie({ name: "Unscored", minutes: 300, score: undefined, startDate: day(2020, 3, 1) }),
          ],
        }),
      ),
    );

    expect(year.headliners.map((item) => item.name)).toEqual(["Gem"]);
  });

  it("breaks a tie for the work closed later", () => {
    const [year] = yearbook(
      toOmniItems(
        library({
          movie: [
            movie({ name: "Earlier", score: 8, startDate: day(2020, 1, 1) }),
            movie({ name: "Later", score: 8, startDate: day(2020, 9, 1) }),
          ],
        }),
      ),
    );

    expect(year.headliners.map((item) => item.name)).toEqual(["Later"]);
  });
});
