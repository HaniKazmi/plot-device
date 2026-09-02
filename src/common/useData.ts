import { useEffect, useState } from "react";
import { PlainDate } from "./date";
import { useGoogleAuth } from "../contexts/GoogleAuthContext";
import type { SheetTab } from "../tabs";

// Resolved per call rather than at module load; see the note in GoogleAuthContext.
const storage = () => localStorage;

const CACHE = new Map<string, unknown>();

/**
 * A cache key that changes when the shape behind it does.
 *
 * A domain's cached objects outlive any change to its model, and the hook hands them to the page
 * synchronously before the first fetch — so a field that became required is simply absent on a
 * returning visitor's first paint, and the component reading it throws. A visitor who never
 * authorises is left on that copy indefinitely, so the window is not a brief one.
 *
 * Bump `version` in the domain's own call whenever its model gains, drops or retypes a field.
 * `dropSupersededVersions` then clears what the previous key held, so a rename does not leave its
 * predecessor's copy in the profile for good.
 */
export const dataCacheKey = (domain: string, version: number) => `${domain}-data-cache-v${version}`;

/**
 * The keys holding an earlier shape of the same domain's cache, given everything in storage.
 *
 * Matched on the domain's own prefix rather than a list of past versions, so retiring a shape
 * means bumping one number and nothing here. The bare `<domain>-data-cache` is included because
 * it is the shape that predates versioning; a different domain's key shares no prefix and is left
 * alone, which is what keeps one tab's bump from emptying another's cache.
 */
export const supersededKeys = (activeKey: string, existing: readonly string[]) => {
  const prefix = activeKey.slice(0, activeKey.lastIndexOf("-v"));
  return existing.filter((key) => key !== activeKey && (key === prefix || key.startsWith(`${prefix}-v`)));
};

const dropSupersededVersions = (activeKey: string) =>
  supersededKeys(activeKey, Object.keys(storage())).forEach((key) => storage().removeItem(key));

/**
 * Any key whose name contains "Date" is revived as a `PlainDate`. It is a convention rather
 * than a schema, so a non-date field named e.g. `updateDate` would be corrupted on reload.
 * The round trip works because `toJSON` emits exactly what `PlainDate.from` parses.
 */
export const dateReviver = (key: string, value: unknown) => {
  if (key.includes("Date")) {
    return PlainDate.from(value as string);
  }
  return value as unknown;
};

/**
 * A cached copy read back, or nothing at all where it cannot be read.
 *
 * The parse is guarded because the caller runs inside a `useState` initialiser: `dateReviver` calls
 * `PlainDate.from`, which throws on any `*Date*` value that is not a bare year or a full day, and a
 * throw during render takes the whole page down — there is no error boundary above it. Discarding
 * the copy costs one visit's offline paint; the fetch replaces it either way.
 *
 * The domain's own `reviver` runs inside the same guard, since it walks the parsed shape and a
 * copy corrupt enough to break the dates can break it too.
 */
export const parseCachedItems = <T>(raw: string, reviver?: (items: T[]) => void): T[] | undefined => {
  try {
    const parsed = JSON.parse(raw, dateReviver) as T[] | null;
    if (!parsed) return undefined;
    reviver?.(parsed);
    return parsed;
  } catch {
    return undefined;
  }
};

/**
 * What to put on screen for a failed fetch.
 *
 * A gapi rejection is not an `Error` but the response itself — `{ result: { error: { message,
 * code } }, status, statusText, body }` — so handing it to `String` yields `[object Object]`,
 * which tells a reader nothing about which sheet refused them or why. The Sheets API's own message
 * is the most specific thing available and names the reason; the status line is the fallback for a
 * refusal that carries no body at all.
 */
export const describeFailure = (cause: unknown): string => {
  if (cause instanceof Error) return cause.message;

  if (typeof cause === "object" && cause !== null) {
    const response = cause as { result?: { error?: { message?: unknown } }; status?: unknown; statusText?: unknown };
    const message = response.result?.error?.message;
    if (typeof message === "string" && message) return message;

    const status = typeof response.status === "number" ? String(response.status) : undefined;
    const statusText = typeof response.statusText === "string" && response.statusText ? response.statusText : undefined;
    const line = [status, statusText].filter(Boolean).join(" ");
    if (line) return `Sheet request failed: ${line}`;
  }

  return String(cause);
};

/**
 * The fetch each storage key currently has in flight, shared by every hook reading that key.
 *
 * The Omnibus tab and a home tab mount the same domain's config, so a route change mid-fetch would
 * otherwise issue a second `values.get` and convert, stringify and store the same library twice.
 * Cleared once the promise settles, so a failed fetch is retried by the next mount rather than
 * replayed to it.
 */
const IN_FLIGHT = new Map<string, Promise<unknown>>();

/**
 * Everything about a domain's cached shape, as one value the domain owns.
 *
 * The version, the converter and any replacer/reviver pair are a matched set — a cache written by
 * one converter is only readable by the reviver that matches it — and the Omnibus tab mounts the
 * same three domains the home tabs do. Passing them as separate arguments at two call sites is
 * what lets a version bump land at one of them.
 *
 * A config must be a module-scope constant: the fetch effect depends on it, and a fresh object per
 * render would refire the fetch on every one.
 *
 * The tab is deliberately not a field. A config lives in its domain's `converter.ts`, which
 * `tabs.ts` imports transitively through that domain's entry component — so a tab read here at
 * module scope is read while `tabs.ts` is still evaluating, and its exports are still in the
 * temporal dead zone. The caller passes it instead, from a component body that runs long after.
 */
export interface DataConfig<T> {
  storageKey: string;
  converter: (json: Record<string, string>[]) => T[];
  /** Re-attaches whatever `replacer` dropped — the two are written as a pair or not at all. */
  reviver?: (items: T[]) => void;
  replacer?: (key: string, value: unknown) => unknown;
}

const useData = <T>(
  { storageKey, converter, reviver, replacer }: DataConfig<T>,
  tab: SheetTab,
): [T[] | undefined, boolean, string | undefined] => {
  /**
   * Whether this session has the sheet's own rows rather than a previous visit's copy.
   *
   * A hit on `CACHE` counts: that map is only ever written by a fetch in this session, so its
   * contents are as fresh as anything a fetch of our own would produce. Reporting it as unloaded
   * is what leaves a caller waiting on several domains — the Omnibus mounts three — unable to tell
   * "still fetching" from "already fetched by the tab you came from", which never resolves.
   *
   * It says nothing about whether the arrival is worth announcing; `DataLoadedSnackbar` decides
   * that from whether it saw the value turn over.
   */
  const [dataLoaded, setDataLoaded] = useState(() => CACHE.has(storageKey));
  /**
   * What went wrong reading the sheet, for a caller to put on screen.
   *
   * The converters reject a bad row by throwing a message that names it — the row number, the
   * item, the column — and that message is the whole point of `sheetError`. Logged and nothing
   * else, it reaches a console nobody has open: the page keeps painting the previous visit's
   * cached copy, or nothing at all for a first-time reader, and re-fails on every mount with no
   * sign that the sheet is the reason.
   *
   * The stale copy is deliberately left standing rather than cleared. A wall of last week's data
   * beside a message naming the row to fix is more use than an empty page, and the message is what
   * keeps that staleness from being silent.
   *
   * A fetch that succeeds clears it, because the row it names has been fixed: left standing, the
   * alert both misreports the sheet and takes the place of the refresh notice, which is the one
   * sign that the data on screen has just turned over.
   */
  const [error, setError] = useState<string | undefined>(undefined);

  const [data, setData] = useState<T[] | undefined>(() => {
    if (CACHE.has(storageKey)) return CACHE.get(storageKey) as T[];
    dropSupersededVersions(storageKey);
    const tempData = storage().getItem(storageKey);
    if (!tempData) return undefined;

    const parsed = parseCachedItems<T>(tempData, reviver);
    // A copy that cannot be read is dropped rather than left to fail the same way on every mount.
    if (!parsed) storage().removeItem(storageKey);
    return parsed;
  });

  const { apiReady, fetchAndConvertSheet } = useGoogleAuth();

  useEffect(() => {
    if (!apiReady || CACHE.has(storageKey)) return;

    let pending = IN_FLIGHT.get(storageKey) as Promise<T[]> | undefined;
    if (!pending) {
      const started = fetchAndConvertSheet(tab, converter);
      IN_FLIGHT.set(storageKey, started);
      // Both outcomes clear the entry, and the identity check keeps a settling fetch from dropping
      // a newer one started after it. Registered as two handlers rather than through `finally`, so
      // a rejection is answered here as well as by the subscriber below — a subscriber that
      // unmounted before the fetch settled leaves nobody else to answer it.
      const forget = () => {
        if (IN_FLIGHT.get(storageKey) === started) IN_FLIGHT.delete(storageKey);
      };
      started.then(forget, forget);
      pending = started;
    }

    pending
      .then((data) => {
        setData(data);
        setDataLoaded(true);
        setError(undefined);

        // Storing is per fetch rather than per subscriber: everything reading this key shares the
        // promise above, and writing a whole library twice is a second full stringify for bytes
        // already in storage.
        if (CACHE.has(storageKey)) return;
        CACHE.set(storageKey, data);
        storage().setItem(storageKey, JSON.stringify(data, replacer));
      })
      .catch((cause: unknown) => {
        console.error(cause);
        setError(describeFailure(cause));
      });
  }, [apiReady, converter, storageKey, tab, fetchAndConvertSheet, replacer]);

  return [data, dataLoaded, error];
};

export default useData;
