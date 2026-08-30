import { describe, expect, it } from "vitest";
import { dataCacheKey, dateReviver, supersededKeys } from "../../src/common/useData";
import { YearMonthDay } from "../../src/common/date";

describe("dataCacheKey", () => {
  it("names a domain's cache and the shape behind it", () => {
    expect(dataCacheKey("show", 2)).toBe("show-data-cache-v2");
  });

  it("gives two versions of one domain different keys", () => {
    // This is the whole mechanism: a model change has to miss the objects written before it, or
    // the hook hands a component fields that model no longer guarantees.
    expect(dataCacheKey("show", 2)).not.toBe(dataCacheKey("show", 1));
  });
});

describe("supersededKeys", () => {
  const stored = ["show-data-cache", "show-data-cache-v1", "show-data-cache-v2", "movie-data-cache-v2", "theme"];

  it("collects the earlier versions of the same domain", () => {
    expect(supersededKeys("show-data-cache-v2", stored)).toEqual(["show-data-cache", "show-data-cache-v1"]);
  });

  it("includes the unversioned key, which is the shape that predates versioning", () => {
    expect(supersededKeys("show-data-cache-v1", ["show-data-cache"])).toEqual(["show-data-cache"]);
  });

  it("leaves the active key alone", () => {
    expect(supersededKeys("show-data-cache-v2", stored)).not.toContain("show-data-cache-v2");
  });

  it("leaves another domain's cache alone", () => {
    // One tab bumping its version must not empty the tabs beside it, which would cost every
    // other domain its offline paint for no reason.
    expect(supersededKeys("show-data-cache-v2", stored)).not.toContain("movie-data-cache-v2");
  });

  it("leaves unrelated keys alone", () => {
    expect(supersededKeys("show-data-cache-v2", stored)).not.toContain("theme");
  });

  it("does not treat a domain whose name extends another as superseded", () => {
    // "show" is a prefix of "showcase", and matching on the bare string would collect it.
    expect(supersededKeys("show-data-cache-v2", ["showcase-data-cache-v1"])).toEqual([]);
  });
});

describe("dateReviver", () => {
  it("still revives a date key, which the cache round trip depends on", () => {
    expect(dateReviver("releaseDate", "2016-11-11")).toBe(YearMonthDay.get(2016, 11, 11));
  });
});
