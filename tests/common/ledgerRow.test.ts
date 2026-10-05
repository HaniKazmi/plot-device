import { describe, expect, it } from "vitest";
import { ledgerParts } from "../../src/common/ledgerRow";

describe("ledgerParts", () => {
  it("joins the parts as the ledger states a list, and keeps them beside the words", () => {
    expect(ledgerParts([{ text: "1 Jan 2020" }, { text: "Physical", category: "format" }])).toEqual({
      value: "1 Jan 2020 · Physical",
      parts: [{ text: "1 Jan 2020" }, { text: "Physical", category: "format" }],
    });
  });

  it("drops a blank part and a missing one, so a row holds no stray separator", () => {
    expect(ledgerParts([undefined, { text: "" }, { text: "Nintendo", category: "publisher" }]).value).toBe("Nintendo");
  });
});
