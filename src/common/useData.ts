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
  const [dataLoaded, setDataLoaded] = useState(false);
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
   */
  const [error, setError] = useState<string | undefined>(undefined);

  const [data, setData] = useState<T[] | undefined>(() => {
    if (CACHE.has(storageKey)) return CACHE.get(storageKey) as T[];
    dropSupersededVersions(storageKey);
    const tempData = storage().getItem(storageKey);
    if (tempData) {
      const parsed = JSON.parse(tempData, dateReviver) as T[];

      reviver?.(parsed);
      return parsed;
    }

    return undefined;
  });

  const { apiReady, fetchAndConvertSheet } = useGoogleAuth();

  useEffect(() => {
    if (!apiReady || CACHE.has(storageKey)) return;
    fetchAndConvertSheet(tab, converter)
      .then((data) => {
        CACHE.set(storageKey, data);
        setData(data);
        setDataLoaded(true);
        storage().setItem(storageKey, JSON.stringify(data, replacer));
      })
      .catch((cause: unknown) => {
        console.error(cause);
        setError(cause instanceof Error ? cause.message : String(cause));
      });
  }, [apiReady, converter, storageKey, tab, fetchAndConvertSheet, replacer]);

  return [data, dataLoaded, error];
};

export default useData;
