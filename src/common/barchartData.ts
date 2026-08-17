import type { Year, YearMonth } from "./date";
import type { Colour } from "../utils/types";
import "../utils/arrayUtils";
import "../utils/mapUtils";

type BarchartTable = (number | null)[][];

export const groupDate = (
  data: { name: string; date: YearMonth | Year; colour: Colour; value: number }[],
): { results: BarchartTable; dates: (YearMonth | Year)[]; groups: { name: string; colour: Colour }[] } => {
  const groupToIndex = new Map<string, { readonly index: number; readonly colour: Colour; total: number }>();
  const dateToIndex = new Map<YearMonth | Year, number>();
  let minDate: YearMonth | Year | undefined;
  let maxDate: YearMonth | Year | undefined;

  const results = data
    .filter((el) => el.date && el.value)
    .sortByKey("date", true)
    .reduce(
      (result, el) => {
        if (!minDate) {
          minDate = el.date;
          maxDate = minDate;
        }

        const groupIndex = groupToIndex.setIfAbsent(el.name, { index: groupToIndex.size, colour: el.colour, total: 0 });
        let dateIndex = dateToIndex.get(el.date);

        if (dateIndex === undefined) {
          maxDate!.iterateToDate(el.date).forEach((date) => {
            dateIndex = dateToIndex.setIfAbsent(date, dateToIndex.size);
          });
        }

        const dateToValue = (result[groupIndex.index] ||= []);
        dateToValue[dateIndex!] = (dateToValue[dateIndex!] ?? 0) + el.value;
        groupIndex.total += el.value;
        maxDate = el.date;

        return result;
      },
      [] as (number | null)[][],
    );

  const groupEntries = Array.from(groupToIndex.entries()).map(([name, { index, colour, total }]) => ({
    name,
    index,
    colour,
    total,
  }));

  const sortedEntries = groupEntries.sortByKey("total", true);
  const sortedResults = sortedEntries.map(({ index }) => results[index] ?? []);

  sortedResults.forEach((groups) => {
    let started = false;
    for (let i = 0; i < dateToIndex.size; i++) {
      if (groups[i] != null) started = true;
      groups[i] = started ? (groups[i] ?? 0) : null;
    }
  });

  // Taken from the pivot's own keys rather than re-walked, so a column's position in `results`
  // and its date cannot disagree.
  const dates = Array.from(dateToIndex.keys());
  const groups = sortedEntries.map(({ name, colour }) => ({ name, colour }));
  return { results: sortedResults, dates, groups };
};

export const convertToCumulative = (groupToDateToValue: BarchartTable) => {
  return groupToDateToValue.map((values) => {
    let sum = 0;
    let started = false;
    return values.map((val) => {
      if (val != null) {
        sum += val;
        started = true;
      }
      return started ? sum : null;
    });
  });
};

export const convertToRanking = (groupToDateToValue: BarchartTable) => {
  const newArray: number[][] = groupToDateToValue.map(() => []);
  const numCols = groupToDateToValue[0]?.length ?? 0;

  for (let col = 0; col < numCols; col++) {
    groupToDateToValue
      .map((row, index) => ({ value: row[col] ?? 0, index }))
      .sort((a, b) => b.value - a.value || b.index - a.index)
      .forEach(({ index }, rank) => {
        newArray[index][col] = rank + 1;
      });
  }

  return newArray;
};
