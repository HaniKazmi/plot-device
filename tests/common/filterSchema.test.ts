import { describe, expect, it } from "vitest";
import {
  categoryRuns,
  categoryTally,
  categoryValues,
  certificateCategory,
  namedSelection,
  schemaPredicates,
  type FilterCategory,
  type FilterSchema,
} from "../../src/common/filterSchema";
import { CERTIFICATES, certificateToColour, type Certificate } from "../../src/utils/types";

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

describe("a category's tally", () => {
  const data = [row({ kind: "Drama" }), row({ kind: "Action" }), row({ kind: "Drama" })];

  it("offers the same vocabulary the values alone do, so a chip and an index cannot differ", () => {
    expect(categoryTally(schema.categories[0], data).values).toEqual(categoryValues(schema.categories[0], data));
  });

  it("counts the rows each value holds", () => {
    expect([...categoryTally(schema.categories[0], data).counts]).toEqual([
      ["Drama", 2],
      ["Action", 1],
    ]);
  });

  it("counts every value in the data, including one the category's own list leaves out", () => {
    const listed: FilterCategory<Row, State> = { ...schema.categories[0], options: () => ["Action"] };
    const { values, counts } = categoryTally(listed, data);

    expect(values).toEqual(["Action"]);
    expect(counts.get("Drama")).toBe(2);
  });
});

describe("a category's runs", () => {
  const platforms = ["Nintendo DS", "Nintendo Switch", "PC", "PlayStation 4", "PlayStation 5", "Xbox 360"];
  const counts = new Map([
    ["Nintendo DS", 55],
    ["Nintendo Switch", 24],
    ["PC", 69],
    ["PlayStation 4", 44],
    ["PlayStation 5", 46],
    ["Xbox 360", 2],
  ]);
  const company = { label: "company", of: (platform: string) => platform.split(" ")[0] };

  it("gives a category with no level one run holding every value, so the surface draws both alike", () => {
    expect(categoryRuns(platforms, counts, undefined)).toEqual([{ values: platforms }]);
  });

  it("gives a run per group holding more than one value, in the order the values arrive", () => {
    const runs = categoryRuns(platforms, counts, company);

    expect(runs.slice(0, 2)).toEqual([
      { group: "Nintendo", values: ["Nintendo DS", "Nintendo Switch"], count: 79 },
      { group: "PlayStation", values: ["PlayStation 4", "PlayStation 5"], count: 90 },
    ]);
  });

  it("leaves a group of one as its value, since a parent there selects the child beside it", () => {
    expect(categoryRuns(platforms, counts, company).at(-1)).toEqual({ values: ["PC", "Xbox 360"] });
  });

  it("trails every loose value on one line rather than each where its own group fell", () => {
    // PC arrives between the two Nintendo platforms and PlayStation's, so a run standing where its
    // first value fell would put a line of one chip between two full ones.
    expect(categoryRuns(platforms, counts, company).map((run) => run.group)).toEqual([
      "Nintendo",
      "PlayStation",
      undefined,
    ]);
  });

  it("draws no trailing line where every value groups with another", () => {
    const grouped = ["Nintendo DS", "Nintendo Switch"];
    expect(categoryRuns(grouped, counts, company)).toEqual([{ group: "Nintendo", values: grouped, count: 79 }]);
  });
});

describe("a selection named as shortly as it is true", () => {
  const runs = [
    { group: "Nintendo", values: ["Nintendo DS", "Nintendo Switch"], count: 79 },
    { group: "PlayStation", values: ["PlayStation 4", "PlayStation 5"], count: 90 },
    { values: ["PC"] },
  ];

  it("names a group whose whole membership is chosen, which is the one chip that chose it", () => {
    expect(namedSelection(["Nintendo DS", "Nintendo Switch"], runs)).toEqual(["Nintendo"]);
  });

  it("names the values themselves where only part of a group is chosen", () => {
    expect(namedSelection(["Nintendo DS"], runs)).toEqual(["Nintendo DS"]);
  });

  it("keeps a value chosen outside any folded group, after the groups it does fold", () => {
    expect(namedSelection(["PlayStation 4", "Nintendo DS", "Nintendo Switch", "PC"], runs)).toEqual([
      "Nintendo",
      "PlayStation 4",
      "PC",
    ]);
  });

  it("leaves an ungrouped category's selection exactly as it was chosen", () => {
    expect(namedSelection(["Drama", "Action"], [{ values: ["Drama", "Action", "Sci-Fi"] }])).toEqual([
      "Drama",
      "Action",
    ]);
  });
});

describe("certificateCategory", () => {
  interface Rated {
    certificate: string;
  }
  const rated = (certificate: string): Rated => ({ certificate });
  const category = certificateCategory<Rated, { certificate: string[] }>(
    "certificate",
    (item) => item.certificate,
    CERTIFICATES,
    (value, scheme) => certificateToColour(value as Certificate, scheme),
  );

  it("offers the board's own order, which a lexicographic sort runs 12, 15, 18, 3, 7", () => {
    const data = [rated("15"), rated("3"), rated("18"), rated("7"), rated("12")];

    expect(category.options!(data)).toEqual(["3", "7", "12", "15", "18"]);
  });

  it("offers only what the rows carry, a board's unused number narrowing to nothing", () => {
    // BBFC issues a 15 where PEGI issues a 16, so each sheet holds five of the six values.
    expect(category.options!([rated("15"), rated("18")])).toEqual(["15", "18"]);
  });

  it("wears the ramp its own charts are drawn in, so a chip and a wedge are one colour", () => {
    expect(category.colourFor!("15", "light")).toBe(certificateToColour("15", "light"));
  });
});
