import { Suspense, lazy, useEffect, useState, useTransition } from "react";
import { HolidaysTab } from "../tabs";
import { fetchAndConvertSheet } from "../utils/googleUtils";
import { Holiday } from "./types";

const Graphs = lazy(() => import(/* webpackPrefetch: true */ "./Graphs"));

let DATA: Holiday[];

const HolidayGraphs = () => {
  const [data, setData] = useState<Holiday[]>();
  const [, startTransition] = useTransition();

  useEffect(() => startTransition(() => getData(setData)), []);

  if (!data) {
    return null;
  }

  return (
    <Suspense>
      <Graphs data={data} />
    </Suspense>
  );
};

const getData = (setData: (b: Holiday[]) => void) => {
  if (DATA) {
    setData(DATA);
    return;
  }

  fetchAndConvertSheet(HolidaysTab, jsonConverter, (data) => {
    DATA = data;
    setData(data);
  });
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
