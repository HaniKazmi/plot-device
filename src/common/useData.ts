import { useEffect, useState } from "react";
import { PlainDate } from "./date";
import { useGoogleAuth } from "../contexts/GoogleAuthContext";
import type { Tab } from "../tabs";

const storage = localStorage;

const CACHE = new Map<string, unknown>();

const useData = <T>(
  storageKey: string,
  tab: Tab,
  converter: (json: Record<string, string>[]) => T[],
  reviver?: (items: T[]) => void,
): [T[] | undefined, boolean] => {
  const [dataLoaded, setDataLoaded] = useState(false);

  const [data, setData] = useState<T[] | undefined>(() => {
    if (CACHE.has(storageKey)) return CACHE.get(storageKey) as T[];
    const tempData = storage.getItem(storageKey);
    if (tempData) {
      const parsed = JSON.parse(tempData, (key, value) => {
        if (key.includes("Date")) {
          return PlainDate.from(value as string);
        }
        return value as unknown;
      }) as T[];

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
        storage.setItem(
          storageKey,
          JSON.stringify(data, (key, value) => {
            if (key === "show") return;
            return value as unknown;
          }),
        );
      })
      .catch(console.error);
  }, [apiReady, converter, storageKey, tab, fetchAndConvertSheet]);

  return [data, dataLoaded];
};

export default useData;
