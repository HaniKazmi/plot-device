import { describe, expect, it } from "vitest";
import { MEDIA, mediaModules } from "../../src/app/media";
import { toOmniItems } from "../../src/app/library";
import Tabs from "../../src/tabs";
import { MEDIA as MEDIA_ORDER, type Medium } from "../../src/utils/types";
import { book } from "../fixtures/books";
import { library } from "../fixtures/library";
import { movie } from "../fixtures/movies";
import { season, show } from "../fixtures/shows";
import { videoGame } from "../fixtures/vgRows";

/**
 * The registry is what a fifth medium is added through, so what these pin is that it is complete
 * and that nothing in it has drifted from what it names: a module for every medium, an id naming
 * a real tab, and the union built arm by arm holding exactly what one flat list of the four holds.
 *
 * The test may read `tabs.ts` where the registry may not: the import direction it is checking is a
 * fact about the running app's evaluation order, and a test evaluates neither entry component.
 */
describe("the medium registry", () => {
  it("has a module for every medium", () => {
    expect(Object.keys(MEDIA).toSorted()).toEqual([...MEDIA_ORDER].toSorted());
  });

  it("files each module under the medium it declares", () => {
    const misfiled = Object.entries(MEDIA).filter(([medium, module]) => module.medium !== medium);

    expect(misfiled).toEqual([]);
  });

  it("names a real tab, without importing one", () => {
    const ids = Tabs.map((tab) => tab.id);

    expect(mediaModules.map((module) => module.tabId).filter((id) => !ids.includes(id))).toEqual([]);
  });

  it("gives each tab at most one module, so a tab's page has one medium to read", () => {
    const ids = mediaModules.map((module) => module.tabId);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("counts in a noun and offers at least one measure", () => {
    const bare = mediaModules.filter((module) => !module.noun || module.measures.length === 0);

    expect(bare).toEqual([]);
  });
});

describe("the union, built arm by arm", () => {
  const parent = show();
  parent.s = [season(parent, { s: 1 })];

  const whole = library({
    game: [videoGame()],
    show: [parent],
    movie: [movie()],
    book: [book()],
  });

  it("holds each medium's rows in the order the registry lists the media", () => {
    expect(toOmniItems(whole).map((item) => item.medium)).toEqual(MEDIA_ORDER);
  });

  it("is each module's own arm over its own rows, and nothing else", () => {
    const arms: Record<Medium, unknown[]> = {
      game: whole.game,
      show: whole.show,
      movie: whole.movie,
      book: whole.book,
    };

    expect(toOmniItems(whole)).toEqual(mediaModules.flatMap((module) => module.toOmniItems(arms[module.medium])));
  });

  it("leaves a medium with no rows out of the list rather than in it as a blank", () => {
    expect(toOmniItems(library({ movie: [movie()] })).map((item) => item.medium)).toEqual(["movie"]);
  });
});
