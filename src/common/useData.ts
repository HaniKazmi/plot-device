import { useEffect, useState } from "react";
import { PlainDate } from "./date";
import { useGoogleAuth } from "../contexts/GoogleAuthContext";
import type { Tab } from "../tabs";

// Resolved per call rather than at module load; see the note in GoogleAuthContext.
const storage = () => localStorage;

const CACHE = new Map<string, unknown>();

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

const useData = <T>(
  storageKey: string,
  tab: Tab,
  converter: (json: Record<string, string>[]) => T[],
  reviver?: (items: T[]) => void,
  replacer?: (key: string, value: unknown) => unknown,
): [T[] | undefined, boolean] => {
  const [dataLoaded, setDataLoaded] = useState(false);

  const [data, setData] = useState<T[] | undefined>(() => {
    if (CACHE.has(storageKey)) return CACHE.get(storageKey) as T[];
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
      .catch(console.error);
  }, [apiReady, converter, storageKey, tab, fetchAndConvertSheet, replacer]);

  return [data, dataLoaded];
};

export default useData;
