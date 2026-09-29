import { useSelectBox } from "./SelectBoxHook";
import { useScheme } from "./useScheme";
import { colourKeyEntries } from "./colourKeyData";
import { neutralFill, type Colour, type Scheme } from "../utils/types";
import { keyLabel } from "../utils/stringUtils";

/**
 * A timeline's Colour picker and everything it decides: the fill a mark wears, and the key naming
 * the fills drawn. One reading of the key for both, so a mark and the swatch naming its colour
 * cannot be asked of two different vocabularies.
 *
 * `colourOf` is the tab's own colour lookup and `valueOf` the word each item shows under a key — the
 * charts' own buckets, so the key's words are the ones the rest of the tab uses.
 */
export const useColourBy = <K extends string, T>(
  keys: readonly K[],
  initial: K,
  colourOf: (item: T, key: K, scheme: Scheme) => Colour | undefined,
  valueOf: (item: T, key: K) => string,
) => {
  const scheme = useScheme();
  const [key, control] = useSelectBox(keys, initial, "Colour");
  return {
    control,
    // Off a vocabulary's table a value answers no colour — a franchise the shared table does not
    // hold, a network off the brand table, a book under certificate — and a mark with no fill would
    // be a gap in its row, so it takes the neutral. The key leaves such a value out, as the library's
    // border key does.
    fill: (item: T): Colour => colourOf(item, key, scheme) || neutralFill(scheme),
    colourKey: (items: readonly T[]) => ({
      field: keyLabel(key),
      entries: colourKeyEntries(
        items,
        (item) => valueOf(item, key),
        (item) => colourOf(item, key, scheme),
      ),
    }),
  };
};
