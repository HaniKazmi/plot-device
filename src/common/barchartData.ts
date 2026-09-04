import { Year, type YearMonth } from "./date";
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

/**
 * Each cell as a percentage of its own column, so the columns read as composition rather than
 * size. A column totalling zero yields zeros: dividing by it would send NaN into a series, which
 * Highcharts draws as a gap indistinguishable from a series that has not started.
 */
export const convertToShare = (groupToDateToValue: BarchartTable): BarchartTable => {
  const totals = columnTotals(groupToDateToValue);

  // Null before a group's first data point survives the transform, or every series would start at
  // the left edge of the chart.
  return groupToDateToValue.map((row) =>
    row.map((value, col) => (value == null ? null : totals[col] ? (value / totals[col]) * 100 : 0)),
  );
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

/**
 * What each column totals across its groups, which is the height a stacked column stands at and
 * the figure a sparkline draws. A cell before a group's first data point is null and counts as
 * nothing, the same way the chart draws it.
 */
export const columnTotals = (groupToDateToValue: BarchartTable): number[] => {
  const numCols = groupToDateToValue[0]?.length ?? 0;
  const totals: number[] = [];

  for (let col = 0; col < numCols; col++) {
    totals[col] = groupToDateToValue.reduce((total, row) => total + (row[col] ?? 0), 0);
  }

  return totals;
};

/** What a chart says in one line to a reader who has not opened it. */
export interface BarchartSummary {
  /** The fullest column, named the way its own grain reads. */
  peak: { label: string; value: number };
  /**
   * The group at the top of the most columns. Absent where one group is drawn, which leads every
   * column of the chart by having nothing to lead against.
   */
  leader?: { name: string; columns: number };
  /** How many columns the pivot holds, and what one column is. */
  columns: number;
  grain: "years" | "months";
}

/**
 * The pivot in a sentence's worth of facts: where the peak is, how big it is, and who led.
 *
 * Figures rather than words, because the words need `format` and a formatted number is the one
 * thing in this module a locale can change.
 */
export const barchartSummary = (
  results: BarchartTable,
  dates: (YearMonth | Year)[],
  groups: { name: string }[],
): BarchartSummary | undefined => {
  if (dates.length === 0 || groups.length === 0) return undefined;

  const totals = columnTotals(results);
  // A tie goes to the earlier column: a peak is where a library first reached its height, not the
  // last time it matched it.
  const peak = totals.reduce((best, total, index) => (total > totals[best] ? index : best), 0);

  return {
    peak: { label: columnLabel(dates[peak]), value: totals[peak] },
    leader: leadingGroup(results, groups, totals),
    columns: dates.length,
    grain: dates[0] instanceof Year ? "years" : "months",
  };
};

/** A column as the axis under it reads: the bare year, or the month and its year. */
const columnLabel = (date: YearMonth | Year) =>
  date instanceof Year ? date.yearString() : `${date.monthString()} ${date.year}`;

/**
 * The group topping the most columns, counted through the same ranking the Rank view plots so the
 * two cannot name different leaders — ties included, which that transform breaks towards the
 * larger group.
 *
 * A column totalling nothing is skipped. The ranking hands rank one to somebody in every column,
 * and a densified year the library recorded nothing in has no leader to name.
 */
const leadingGroup = (results: BarchartTable, groups: { name: string }[], totals: number[]) => {
  if (groups.length < 2) return undefined;

  const ranked = convertToRanking(results);
  const won = groups.map((_, group) => totals.filter((total, col) => total > 0 && ranked[group][col] === 1).length);
  const best = won.reduce((leader, columns, index) => (columns > won[leader] ? index : leader), 0);

  return won[best] > 0 ? { name: groups[best].name, columns: won[best] } : undefined;
};
