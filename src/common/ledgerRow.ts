/**
 * One part of a ledger value: its words, and the filter category it is a value of where it is one —
 * which is what lets the ledger name it as a way to everything else carrying it.
 */
export interface LedgerPart {
  text: string;
  category?: string;
}

/**
 * A ledger value from its parts, joined as the ledger states a list and the blank ones dropped, with
 * the parts kept beside the words so a row stating a director and a genre can link each.
 */
export const ledgerParts = (parts: readonly (LedgerPart | undefined)[]) => {
  const kept = parts.filter((part): part is LedgerPart => !!part && part.text !== "");
  return { value: kept.map((part) => part.text).join(" · "), parts: kept };
};
