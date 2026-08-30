import type { Distinct } from "../utils/types";

export type YearNumber = Distinct<number, "Year">;

export abstract class PlainDate {
  static from(string: string) {
    if (string.length === 10) {
      const [year, month, day] = string.split("-").map((part) => parseInt(part));
      return YearMonthDay.get(year, month, day);
    } else if (string.length === 4) {
      return Year.get(parseInt(string));
    } else {
      throw new Error(`Unkown Date Format: ${string}`);
    }
  }

  daysTo(end?: PlainDate) {
    if (!end) {
      return undefined;
    }

    if (this > end) {
      throw new Error("Invalid comparison");
    }

    if (!(this instanceof YearMonthDay && end instanceof YearMonthDay)) {
      return undefined;
    }

    let daysToStart = this.day - 1;
    for (let i = 1; i < this.month; i++) {
      daysToStart += monthToDays(i, this.year);
    }

    let daysToEnd = end.day;

    for (let i = this.year; i < end.year; i++) {
      daysToEnd += i % 4 === 0 ? 366 : 365;
    }

    for (let i = 1; i < end.month; i++) {
      daysToEnd += monthToDays(i, end.year);
    }

    return daysToEnd - daysToStart;
  }

  lte(date: PlainDate) {
    return this.toString() <= date.toString();
  }

  abstract increment(): this;

  /**
   * The first and last day this value can mean. A `Year` denotes a whole year and a `YearMonth` a
   * whole month, so the two differ for them and coincide for a `YearMonthDay`.
   *
   * This is how a consumer states which end of an imprecise date it wants, rather than reaching
   * for a subclass and picking one by accident.
   */
  abstract firstDay(): YearMonthDay;

  abstract lastDay(): YearMonthDay;

  iterateToDate(endDate: PlainDate): this[] {
    const array: this[] = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    for (let date = this; date.lte(endDate); date = date.increment()) {
      array.push(date);
    }

    return array;
  }

  abstract toString(): string;
}

export class Year extends PlainDate {
  static #cache = new Map<number, Year>();

  static get(year: number) {
    let val = this.#cache.get(year);
    if (!val) {
      val = new Year(year as YearNumber);
      this.#cache.set(year, val);
    }
    return val;
  }

  private constructor(public readonly year: YearNumber) {
    super();
  }

  increment() {
    return Year.get(this.year + 1) as this;
  }

  yearString = () => {
    return this.year.toString();
  };

  toString = this.yearString;
  toJSON = this.toString;
  valueOf = this.toString;

  toYear() {
    return this;
  }

  firstDay() {
    return YearMonthDay.get(this.year, 1, 1);
  }

  lastDay() {
    return YearMonthDay.get(this.year, 12, 31);
  }
}

export class YearMonth extends PlainDate {
  static #cache = new Map<number, YearMonth>();

  static get(year: number, month: number) {
    const key = year * 100 + month;
    let val = this.#cache.get(key);
    if (!val) {
      val = new YearMonth(year as YearNumber, month);
      this.#cache.set(key, val);
    }
    return val;
  }

  private constructor(
    public readonly year: YearNumber,
    public readonly month: number,
  ) {
    super();
  }

  increment() {
    const [newYear, newMonth] = nextMonth(this.year, this.month);
    return YearMonth.get(newYear, newMonth) as this;
  }

  yearMonthString = () => {
    return `${this.year}-${padZero(this.month)}`;
  };

  monthString = () => {
    return monthStringsArray[this.month - 1];
  };

  toString = this.yearMonthString;
  valueOf = this.toString;
  toJSON() {
    throw new Error("Not Implemented");
  }

  startOfMonth() {
    return YearMonthDay.get(this.year, this.month, 1);
  }

  firstDay() {
    return this.startOfMonth();
  }

  lastDay() {
    return YearMonthDay.get(this.year, this.month, monthToDays(this.month, this.year));
  }
}

export class YearMonthDay extends PlainDate {
  static #cache = new Map<number, YearMonthDay>();

  static get(year: number, month: number, day: number) {
    const key = year * 10_000 + month * 100 + day;
    let val = this.#cache.get(key);
    if (!val) {
      val = new YearMonthDay(year as YearNumber, month, day);
      this.#cache.set(key, val);
    }
    return val;
  }

  static currentDate() {
    const date = new Date();
    return new YearMonthDay(date.getFullYear() as YearNumber, date.getMonth() + 1, date.getDate());
  }

  private constructor(
    public readonly year: YearNumber,
    public readonly month: number,
    public readonly day: number,
  ) {
    super();
  }

  toString = () => {
    return `${this.yearMonthString()}-${padZero(this.day)}`;
  };

  toJSON = this.toString;
  valueOf = this.toString;

  yearMonthString() {
    return `${this.yearString()}-${padZero(this.month)}`;
  }

  toYear() {
    return Year.get(this.year);
  }

  toYearMonth() {
    return YearMonth.get(this.year, this.month);
  }

  yearString() {
    return this.year.toString();
  }

  addMonth() {
    const [newYear, newMonth] = nextMonth(this.year, this.month);
    return YearMonthDay.get(newYear, newMonth, this.day);
  }

  increment() {
    if (this.day < monthToDays(this.month, this.year)) {
      return YearMonthDay.get(this.year, this.month, this.day + 1) as this;
    }

    const [newYear, newMonth] = nextMonth(this.year, this.month);
    return YearMonthDay.get(newYear, newMonth, 1) as this;
  }

  firstDay() {
    return this;
  }

  lastDay() {
    return this;
  }

  startOfMonth() {
    return YearMonthDay.get(this.year, this.month, 1);
  }
}

const padZero = (num: number) => num.toString().padStart(2, "0");

const monthToDaysArray = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const monthStringsArray = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const monthToDays = (month: number, year: number) => {
  if (month === 2 && year % 4 === 0) {
    return 29;
  }

  return monthToDaysArray[month - 1];
};

const nextMonth = (year: YearNumber, month: number): [YearNumber, number] =>
  month === 12 ? [(year + 1) as YearNumber, 1] : [year, month + 1];

/**
 * A range the way a reader says one — "6 Sep – 20 Oct 2023", with the year given once when both
 * ends share it, and dropped to just the year where that is all the source recorded.
 *
 * `PlainDate.toString` is the machine form: it sorts, round-trips through storage and never
 * argues about a locale. This is the other job, and keeping the two apart is what stops either
 * being bent towards the other.
 */
export const formatDateRange = (start: YearMonthDay | Year, end?: YearMonthDay | Year) => {
  if (!end) return `${describeDate(start)} – present`;
  // Interning is bypassed by `currentDate`, so identity is not a safe test for the same day.
  if (start.toString() === end.toString()) return describeDate(start);

  const sameYear = start.year === end.year;
  return `${describeDate(start, !sameYear)} – ${describeDate(end)}`;
};

/**
 * One date the way a reader says one — "6 Sep 2023", or just the year where that is all the
 * source recorded. The single-ended half of `formatDateRange`, for a line that already says which
 * end of something it is quoting.
 */
export const formatDate = (date: YearMonthDay | Year) => describeDate(date);

const describeDate = (date: YearMonthDay | Year, withYear = true) =>
  date instanceof YearMonthDay
    ? `${date.day} ${date.toYearMonth().monthString()}${withYear ? ` ${date.year}` : ""}`
    : `${date.year}`;

export const CURRENT_PLAINDATE = YearMonthDay.currentDate();

export const CURRENT_YEAR = CURRENT_PLAINDATE.year;
export const EARLIEST_YEAR = 2002 as YearNumber;
