import { Suspense, lazy, useEffect, useState, useTransition } from "react";
import { Tab } from "../tabs";
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
}

const getData = (setData: (b: any[]) => void) => {
  if (DATA) {
    setData(DATA);
    return;
  }

  fetchAndConvertSheet(HolidayTab, jsonConverter, (data) => {
    DATA = data;
    setData(data);
  });
};

const jsonConverter = (json: Record<string, string>[]) => {
  return json.map((row) => {
    return {
      city: row.City,
      country: row.Country
    }
  })
}

const HolidayTab: Tab = {
  id: "holiday",
  name: "Holiday",
  spreadsheetId: "1tjcFfNZau5DElrTos2RFjpvYWJJleTQIg8kWxdjdgnc",
  range: "Locations!A:Z",
  component: <HolidayGraphs />,
  primaryColour: "#277114",
  secondaryColour: "#142771"
};

export default HolidayTab;
