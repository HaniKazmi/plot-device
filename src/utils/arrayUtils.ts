type ValueNumber<T> = keyof { [P in keyof T as T[P] extends number | undefined ? P : never]: T[P] };

declare global {
  interface Array<T> {
    sum(key: T extends number ? void : ValueNumber<T>): number;
    sortByKey(key: keyof T): T[];
  }
}

const reducerKey = <T>(input: ValueNumber<T>) => {
  return (a: number, b: T) => {
    const num = b[input] as number | undefined;
    return a + (num ?? 0);
  };
};

if (!Array.prototype.sum) {
  Array.prototype.sum = function <T>(key: T extends number ? never : ValueNumber<T>) {
    if (key !== undefined) {
      return (this as T[]).reduce(reducerKey(key), 0);
    }
    return (this as number[]).reduce((a, b) => a + b, 0);
  };
}

if (!Array.prototype.sortByKey) {
  Array.prototype.sortByKey = function <T>(key: keyof T): T[] {
    return this.sort((aObj: T, bObj: T) => {
      const a = aObj[key];
      const b = bObj[key];

      if (a === b) return 0;
      if (!a) return -1;
      if (!b) return 1;
      return a < b ? 1 : -1;
    });
  };
}

export const arrayToJson = (data: string[][]) => {
  const [header, ...rows] = data;
  return rows.map((row) =>
    row.reduce((json, val, index) => {
      json[header[index]] = val;
      return json;
    }, {} as Record<string, string>)
  );
};

export {};
