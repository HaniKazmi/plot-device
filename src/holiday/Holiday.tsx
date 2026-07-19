import { Suspense, lazy, useEffect, useState, useTransition } from "react";
import { HolidaysTab } from "../tabs";
import { useGoogleAuth } from "../contexts/GoogleAuthContext";
import { Holiday } from "./types";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

let DATA: Holiday[];

const HolidayGraphs = () => {
  const [data, setData] = useState<Holiday[]>();
  const [, startTransition] = useTransition();
  const { apiReady, fetchAndConvertSheet } = useGoogleAuth();

  useEffect(() => {
    if (!apiReady) return;
    startTransition(() => {
      if (DATA) {
        setData(DATA);
        return;
      }
      fetchAndConvertSheet(HolidaysTab, jsonConverter)
        .then((fetchedData) => {
          DATA = fetchedData;
          setData(fetchedData);
        })
        .catch(console.error);
    });
  }, [apiReady, fetchAndConvertSheet]);

  if (!data) {
    return null;
  }

  return (
    <Suspense>
      <Graphs data={data} />
    </Suspense>
  );
};

const jsonConverter = (json: Record<string, string>[]) => {
  return json.map((row) => {
    return {
      city: row.City,
      country: row.Country,
    };
  });
};

export default HolidayGraphs;
