import { beforeEach, describe, expect, it } from "vitest";
import {
  closeSearch,
  openPage,
  openSearch,
  searchState,
  setSearchMode,
  setSearchScope,
  toggleSearchMode,
} from "../../src/common/searchOpen";

// The store is one module-scope value for the life of the page, so each case opens the box itself
// rather than leaning on where the case before it left the reader.
beforeEach(() => {
  closeSearch();
});

describe("the box's own position", () => {
  it("counts every request, which is what makes a second chord reach an already-open box", () => {
    const before = searchState().request;
    openSearch();
    openSearch();

    expect(searchState().request).toBe(before + 2);
    expect(searchState().mode).toBe("find");
  });

  it("notifies nobody about a close it has already made", () => {
    openSearch();
    closeSearch();
    const held = searchState();
    closeSearch();

    expect(searchState()).toBe(held);
  });
});

describe("the scope a category holds Find to", () => {
  it("lapses when the box closes, a chip being a constraint nothing on a reopened box explains", () => {
    openSearch();
    setSearchScope("genre");
    closeSearch();
    openSearch();

    expect(searchState().scope).toBeNull();
  });

  it("survives a second request for the caret, which asks for the field and not for a way out", () => {
    openSearch();
    setSearchScope("genre");
    openSearch();

    expect(searchState().scope).toBe("genre");
  });

  it("lapses on a change of mode, This page having its own idea of which category is open", () => {
    openSearch();
    setSearchScope("director");
    setSearchMode("page");

    expect(searchState().scope).toBeNull();
  });

  it("lapses on the chord that swaps the mode, which is that same door", () => {
    openSearch();
    setSearchScope("director");
    toggleSearchMode();

    expect(searchState().scope).toBeNull();
  });

  it("lapses where the rail opens This page outright, a path that never passes through Find", () => {
    openSearch();
    setSearchScope("network");
    openPage();

    expect(searchState().scope).toBeNull();
  });

  it("clears on a scope of nothing, which is what the chip's ✕ and ⌫ on an empty field both send", () => {
    openSearch();
    setSearchScope("genre");
    setSearchScope(null);

    expect(searchState().scope).toBeNull();
  });

  it("costs no render where the box is held to that category already", () => {
    openSearch();
    setSearchScope("genre");
    const held = searchState();
    setSearchScope("genre");

    expect(searchState()).toBe(held);
  });
});
