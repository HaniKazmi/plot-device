import { useEffect, useMemo, useState } from "react";
import { PlainDate } from "./date";
import { fetchAndConvertSheet, useApiReady, useSetGuestModeSetter } from "../utils/googleUtils";
import type { Tab } from "../tabs";

const storage = localStorage;

const useData = <T>(
  storageKey: string,
  tab: Tab,
  converter: (json: Record<string, string>[]) => T[],
  useDataStore: () => readonly [T[], (data: T[]) => void],
  reviver?: (items: T[]) => void,
  filter?: (item: T) => boolean,
): [T[] | undefined, boolean] => {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [store, setStore] = useDataStore();
  const [guestMode, setGuestMode] = useState(false);
  const { setGuestModeSetter } = useSetGuestModeSetter();

  useEffect(() => {
    if (filter) {
      setGuestModeSetter((guestMode: boolean) => setGuestMode(guestMode))
    }
  }, [setGuestModeSetter, filter])

  const [data, setData] = useState<T[] | undefined>(() => {
    if (store) return store;
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

  const { apiReady } = useApiReady();

  useEffect(() => {
    if (!apiReady || store) return;
    fetchAndConvertSheet(tab, converter, (data) => {
      setStore(data);
      setData(data);
      setDataLoaded(true);
      storage.setItem(
        storageKey,
        JSON.stringify(data, (key, value) => {
          if (key === "show") return;
          return value as unknown;
        }),
      );
    });
  }, [apiReady, converter, store, setStore, storageKey, tab]);

  const filteredData = useMemo(() => filter && guestMode ? data?.filter(filter) : data, [data, filter, guestMode])

  return [filteredData, dataLoaded];
};

export default useData;
