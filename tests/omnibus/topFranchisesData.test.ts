import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { toOmniItems } from "../../src/app/library";
import { franchiseWorks, PICTURES_PER_FRANCHISE, topFranchises } from "../../src/omnibus/topFranchisesData";
import { book } from "../fixtures/books";
import { videoGame } from "../fixtures/gameRows";
import { library } from "../fixtures/library";
import { movie } from "../fixtures/movies";
import { season, show } from "../fixtures/shows";

const day = (year: number, month: number, date: number) => YearMonthDay.get(year, month, date);

const witcher = () => {
  const series = show({ name: "The Witcher", franchise: "Witcher" });
  series.s.push(
    season(series, { startDate: day(2020, 1, 1), endDate: day(2020, 1, 20) }),
    season(series, { startDate: day(2022, 1, 1), endDate: day(2022, 1, 20) }),
  );
  return toOmniItems(
    library({
      game: [
        videoGame({
          name: "Witcher 3",
          franchise: "Witcher",
          hours: 155,
          startDate: day(2018, 1, 1),
          endDate: day(2018, 6, 1),
        }),
        videoGame({
          name: "Celeste",
          franchise: "Celeste",
          hours: 30,
          startDate: day(2019, 1, 1),
          endDate: day(2019, 2, 1),
        }),
      ],
      show: [series],
      book: [
        book({ name: "The Last Wish", franchise: "Witcher", startDate: day(2016, 1, 1), endDate: day(2016, 2, 1) }),
      ],
      movie: [movie({ name: "Arrival", franchise: "Arrival", startDate: day(2017, 1, 14) })],
    }),
  );
};

describe("topFranchises", () => {
  it("runs biggest first in the page's measure", () => {
    expect(topFranchises(witcher(), "Hours").map((card) => card.franchise)).toEqual(["Witcher", "Celeste", "Arrival"]);
    expect(topFranchises(witcher(), "Items")[0]).toMatchObject({ franchise: "Witcher", figure: 4 });
  });

  it("states the years a franchise ran and its entries per medium, in the page's medium order", () => {
    const [card] = topFranchises(witcher(), "Items");

    expect(card).toMatchObject({ from: 2016, to: 2022 });
    expect(card.media).toEqual([
      { medium: "game", entries: 1 },
      { medium: "show", entries: 2 },
      { medium: "book", entries: 1 },
    ]);
  });

  it("holds every entry, whose works are each one picture newest first, a show standing for all its seasons", () => {
    const [card] = topFranchises(witcher(), "Items");

    const works = franchiseWorks(card.entries);
    expect(works.map((work) => work.name)).toEqual(["The Witcher", "Witcher 3", "The Last Wish"]);
  });
});

describe("franchiseWorks", () => {
  it("lists every work, newest first, uncapped", () => {
    const items = toOmniItems(
      library({
        game: Array.from({ length: PICTURES_PER_FRANCHISE + 2 }, (_, index) =>
          videoGame({
            name: `Game ${index}`,
            franchise: "Series",
            startDate: day(2010 + index, 1, 1),
            endDate: day(2010 + index, 2, 1),
          }),
        ),
      }),
    );

    expect(franchiseWorks(items).map((work) => work.name)).toEqual(
      Array.from({ length: PICTURES_PER_FRANCHISE + 2 }, (_, index) => `Game ${PICTURES_PER_FRANCHISE + 1 - index}`),
    );
  });
});
