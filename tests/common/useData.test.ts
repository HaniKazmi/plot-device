import { describe, expect, it } from "vitest";
import { dataCacheKey, dateReviver, describeFailure, parseCachedItems, supersededKeys } from "../../src/common/useData";
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

describe("parseCachedItems", () => {
  it("reads a stored library back, dates and all", () => {
    const stored = JSON.stringify([{ name: "Hades", releaseDate: "2020-09-17" }]);

    expect(parseCachedItems<{ name: string; releaseDate: unknown }>(stored)?.[0].releaseDate).toBe(
      YearMonthDay.get(2020, 9, 17),
    );
  });

  it("runs the domain's own reviver over what it parsed", () => {
    const stored = JSON.stringify([{ name: "Hades" }]);

    const parsed = parseCachedItems<{ name: string; seen?: boolean }>(stored, (items) =>
      items.forEach((item) => (item.seen = true)),
    );

    expect(parsed?.[0].seen).toBe(true);
  });

  it("treats a date it cannot parse as no cache at all", () => {
    // The caller runs inside a useState initialiser, so a throw here happens during render and
    // blanks the page — there is no boundary above it — where an unreadable copy costs one
    // visit's offline paint and is replaced by the fetch regardless.
    expect(parseCachedItems(JSON.stringify([{ startDate: "2024-05" }]))).toBeUndefined();
    expect(parseCachedItems(JSON.stringify([{ startDate: null }]))).toBeUndefined();
  });

  it("treats storage that is not JSON at all as no cache", () => {
    expect(parseCachedItems("{ not json")).toBeUndefined();
  });

  it("treats a reviver that cannot walk the copy as no cache", () => {
    // A copy corrupt enough to break the dates can break the reviver that re-attaches a parent
    // pointer over it, so the two are guarded together or neither is.
    const stored = JSON.stringify([{ name: "Hades" }]);

    expect(
      parseCachedItems(stored, () => {
        throw new Error("no seasons to attach");
      }),
    ).toBeUndefined();
  });

  it("treats a stored null as no cache rather than handing back a library of nothing", () => {
    expect(parseCachedItems("null")).toBeUndefined();
  });
});

describe("describeFailure", () => {
  it("states an Error's own message", () => {
    expect(describeFailure(new Error("Row 12 names no genre"))).toBe("Row 12 names no genre");
  });

  it("states the Sheets API's own complaint, which a rejection carries instead of an Error", () => {
    // A gapi rejection is the response object itself, so the message the reader needs is nested
    // rather than on a `message` property, and stringifying the whole thing yields nothing.
    const rejection = {
      result: { error: { code: 403, message: "The caller does not have permission" } },
      status: 403,
      statusText: "Forbidden",
    };

    expect(describeFailure(rejection)).toBe("The caller does not have permission");
  });

  it("falls back to the status line for a refusal that carries no body", () => {
    expect(describeFailure({ status: 503, statusText: "Service Unavailable" })).toBe(
      "Sheet request failed: 503 Service Unavailable",
    );
  });

  it("uses whichever half of the status line the response has", () => {
    expect(describeFailure({ status: 500 })).toBe("Sheet request failed: 500");
    expect(describeFailure({ statusText: "Gateway Timeout" })).toBe("Sheet request failed: Gateway Timeout");
  });

  it("prefers the body's message over the status line, which names the sheet's own reason", () => {
    const rejection = { result: { error: { message: "Unable to parse range: Games List!A:Z" } }, status: 400 };

    expect(describeFailure(rejection)).toBe("Unable to parse range: Games List!A:Z");
  });

  it("states a cause with no shape of its own as it stands", () => {
    expect(describeFailure("network down")).toBe("network down");
  });
});
