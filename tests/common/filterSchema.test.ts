import { describe, expect, it } from "vitest";
import {
  categoryValues,
  schemaPredicates,
  type FilterCategory,
  type FilterSchema,
} from "../../src/common/filterSchema";

interface Row {
  name: string;
  kind: string;
  endless: boolean;
}

interface State {
  endless: boolean;
  kind: string[];
  measure: string;
}

/**
 * A schema of its own rather than a domain's, so what is under test is the composition and not
 * whichever tab happened to be borrowed: each domain's own `filters.test.ts` drives its schema
 * through the predicate its page actually filters by.
 */
const schema: FilterSchema<Row, State> = {
  toggles: [{ key: "endless", label: "Endless", hides: (row) => !row.endless }],
  categories: [{ key: "kind", label: "kind", valueOf: (row) => row.kind }],
};

const row = (overrides: Partial<Row> = {}): Row => ({ name: "One", kind: "Action", endless: false, ...overrides });

const state = (overrides: Partial<State> = {}): State => ({ endless: true, kind: [], measure: "Items", ...overrides });

const keeps = (values: State, item: Row) => schemaPredicates(schema, values).every((predicate) => predicate(item));

describe("toggles", () => {
  it("contributes no predicate at all while a toggle is on", () => {
    // Not a predicate that happens to answer true: an inactive control costs the page nothing to
    // walk, which is what lets a domain spread the list beside its own rules.
    expect(schemaPredicates(schema, state())).toHaveLength(0);
  });

  it("applies the toggle's rule while it is off", () => {
    expect(keeps(state({ endless: false }), row({ endless: true }))).toBe(false);
    expect(keeps(state({ endless: false }), row({ endless: false }))).toBe(true);
  });
});

describe("categories", () => {
  it("is no constraint while nothing is selected", () => {
    expect(schemaPredicates(schema, state({ kind: [] }))).toHaveLength(0);
  });

  it("keeps only the selected values once anything is selected", () => {
    expect(keeps(state({ kind: ["Action"] }), row({ kind: "Action" }))).toBe(true);
    expect(keeps(state({ kind: ["Action"] }), row({ kind: "Drama" }))).toBe(false);
  });
});

describe("a toggle and a category together", () => {
  it("narrows by both, an item having to satisfy every predicate in the list", () => {
    const both = state({ endless: false, kind: ["Action"] });

    expect(schemaPredicates(schema, both)).toHaveLength(2);
    expect(keeps(both, row({ kind: "Action", endless: false }))).toBe(true);
    expect(keeps(both, row({ kind: "Action", endless: true }))).toBe(false);
    expect(keeps(both, row({ kind: "Drama", endless: false }))).toBe(false);
  });
});

describe("the values a category offers", () => {
  const data = [row({ kind: "Drama" }), row({ kind: "Action" }), row({ kind: "Drama" })];

  it("falls to the distinct values in the data where the category states none", () => {
    expect(categoryValues(schema.categories[0], data)).toEqual(["Action", "Drama"]);
  });

  it("takes the category's own list where it states one", () => {
    const listed: FilterCategory<Row, State> = { ...schema.categories[0], options: () => ["Only this"] };

    expect(categoryValues(listed, data)).toEqual(["Only this"]);
  });
});
