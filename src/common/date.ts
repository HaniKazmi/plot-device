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

  startOfYear() {
    return YearMonthDay.get(this.year, 1, 1);
  }

  endOfYear() {
    return YearMonthDay.get(this.year, 12, 31);
  }

  yearMonthString(): undefined {
    return undefined;
  }

  toYearMonth() {
    return undefined;
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
    let newYear = this.year;
    let newMonth = this.month + 1;

    if (newMonth > 12) {
      newMonth = 1;
      newYear = (newYear + 1) as YearNumber;
    }
    return YearMonth.get(newYear, newMonth) as this;
  }

  yearMonthString = () => {
    return `${this.year}-${padZero(this.month)}`;
  };

  toString = this.yearMonthString;
  valueOf = this.toString;
  toJSON() {
    throw new Error("Not Implemented");
  }
}

export class YearMonthDay extends PlainDate {
  #date: Date | undefined = undefined;
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
    let newYear = this.year;
    let newMonth = this.month + 1;

    if (newMonth > 12) {
      newMonth = 1;
      newYear = (newYear + 1) as YearNumber;
    }
    return YearMonthDay.get(newYear, newMonth, this.day);
  }

  increment() {
    let newYear = this.year;
    let newMonth = this.month;
    let newDay = this.day + 1;

    if (newDay > monthToDays(newMonth, newYear)) {
      newDay = 1;
      newMonth++;
    }

    if (newMonth > 12) {
      newMonth = 1;
      newYear = (newYear + 1) as YearNumber;
    }
    return YearMonthDay.get(newYear, newMonth, newDay) as this;
  }

  toDate() {
    return (this.#date ||= new Date(this.toString()));
  }

  startOfYear() {
    return this;
  }
}

const padZero = (num: number) => num.toString().padStart(2, "0");

const monthToDaysArray = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const monthToDays = (month: number, year: number) => {
  if (month === 2 && year % 4 === 0) {
    return 29;
  }

  return monthToDaysArray[month - 1];
};

export const CURRENT_PLAINDATE = YearMonthDay.currentDate();

export const CURRENT_YEAR = CURRENT_PLAINDATE.year;
export const EARLIEST_YEAR = 2002 as YearNumber;
