import { createContext, useContext, type ReactNode } from "react";
import type { YearMonthDay } from "./date";
import type { Fill, Medium } from "../utils/types";

/**
 * One entry of a franchise, in the vocabulary a card's strip draws whatever medium it came from.
 *
 * The strip lives in `common/` and a tracked domain may not import another, so the union of the
 * four libraries is built where all four already meet — the composing tab — and handed down as
 * this shape. Each domain's own records are assignable to it too, which is how the same strip is
 * drawn from a single medium's index while the other three libraries are still on their way.
 */
export interface FranchiseEntry {
  /** Unique across the four libraries: the medium and the key its own tab treats as unique. */
  key: string;
  /**
   * What a card compares its own item against to find itself on the strip. A game, a film and a
   * book answer their own key; a season answers its show's, because the card is the show's and
   * every season of it is the subject.
   */
  subject: string;
  franchise: string;
  medium: Medium;
  fill: Fill;
  /** How the entry is named on the strip: a film's title, a show's name with its season number. */
  label: string;
  start: YearMonthDay;
  end: YearMonthDay;
  /** False where the sheet recorded a year and no month, so the span's edges are not dates. */
  precise: boolean;
  /** The entry's own hover card, built only when the pointer arrives. */
  hoverCard: () => ReactNode;
}

export type FranchiseUnion = Map<string, FranchiseEntry[]>;

/**
 * Every franchise across the four libraries, keyed on the raw franchise column, or `undefined`
 * until all four have loaded. A standalone work names itself in that column, so it is a group of
 * one and every consumer tests the group's size the way the per-domain indexes are tested.
 */
export const FranchiseUnionContext = createContext<FranchiseUnion | undefined>(undefined);

export const useFranchiseUnion = (franchise: string): FranchiseEntry[] | undefined =>
  useContext(FranchiseUnionContext)?.get(franchise);
