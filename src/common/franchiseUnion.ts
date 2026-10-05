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
  /** The entry's own hover card, built only when the pointer arrives. */
  hoverCard: () => ReactNode;
}

export type FranchiseUnion = Map<string, FranchiseEntry[]>;

/**
 * Every franchise across the four libraries, keyed on the raw franchise column, or `undefined`
 * until all four have loaded. A standalone work names itself in that column, so it is a franchise
 * of one, which a strip draws nothing for: a strip places its item among others.
 */
export const FranchiseUnionContext = createContext<FranchiseUnion | undefined>(undefined);

export const useFranchiseUnion = (franchise: string): FranchiseEntry[] | undefined =>
  useContext(FranchiseUnionContext)?.get(franchise);

/**
 * Where a franchise's own page is, as an href, or `undefined` where a mention of it should stay
 * words: the franchise whose page the reader is already on. Answered by the composing layer,
 * which alone knows the route and the whole library; until it does, every mention stays words.
 */
export const FranchisePageContext = createContext<(franchise: string) => string | undefined>(() => undefined);
