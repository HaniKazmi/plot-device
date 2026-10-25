import { describe, expect, it } from "vitest";
import { franchiseAt, franchisePath } from "../../src/app/franchisePage";

describe("franchiseAt", () => {
  it("names the franchise a page's path was built for, a space included", () => {
    expect(franchiseAt(franchisePath("Star Wars"))).toBe("Star Wars");
  });

  it("keeps a slash inside the name as part of it", () => {
    expect(franchiseAt(franchisePath("AC/DC"))).toBe("AC/DC");
  });

  it("names nothing on a path that is no franchise's page", () => {
    expect(franchiseAt("/omnibus")).toBeUndefined();
    expect(franchiseAt("/games")).toBeUndefined();
  });

  it("reads a malformed escape as written rather than throwing", () => {
    expect(franchiseAt("/omnibus/franchise/100%")).toBe("100%");
  });
});
