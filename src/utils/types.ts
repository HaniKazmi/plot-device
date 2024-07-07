import { Status as ShowStatus } from "../show/types";
import { Status as VgStatus } from "../vg/types";

export type KeysMatching<T, V> = keyof { [P in keyof T as T[P] extends V ? P : never]: P };
export type Predicate<T> = (input: T) => boolean;

export type Distinct<T, DistinctName> = T & { __TYPE__: DistinctName };

export type Colour = Distinct<string, "Colour">;

export const statusToColour = ({ status }: { status: VgStatus | ShowStatus }) => {
  switch (status) {
    case "Abandoned":
      return "#d62728" as Colour;
    case "Beat":
    case "Ended":
      return "#2ca02c" as Colour;
    case "Cancelled":
      return "#d67728" as Colour;
    case "Endless":
    case "Up To Date":
      return "#1f77b4" as Colour;
    case "Playing":
    case "Watching":
      return "#17becf" as Colour;
    case "Next":
    case "Backlog":
      return "black" as Colour;
  }
};
