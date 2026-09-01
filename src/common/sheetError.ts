import { isAgeRating, type AgeRating } from "../utils/types";
import { PlainDate, YearMonthDay } from "./date";

/**
 * Bad spreadsheet data is meant to fail loudly rather than be papered over, but a bare
 * `Unkown Date Format: ` or `Cannot read properties of undefined` says nothing about which row
 * to go and fix. These wrap a failure in the identity of the row that caused it.
 */

/** The spreadsheet row a header-stripped record came from, for quoting in an error. */
export const sheetRow = (index: number) => index + 2;

/**
 * Runs `parse`, re-throwing any failure prefixed with what was being read.
 *
 * The original error is kept as `cause`, so the underlying message and stack survive.
 */
export const describing = <T>(context: string, parse: () => T): T => {
  try {
    return parse();
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`${context}: ${detail}`, { cause });
  }
};

/** Throws with `context` prefixed, for a problem detected rather than caught. */
export const sheetError = (context: string, detail: string): never => {
  throw new Error(`${context}: ${detail}`);
};

/**
 * Reads a certificate cell, rejecting one the colour map could not paint.
 *
 * All three sheets record an age rating and all three feed it to `ageRatingToColour`, which throws
 * on a value it does not know. Left to reach that, the failure surfaces from inside a render and
 * names the value but not the row carrying it — so every converter reads the column through here
 * instead, while it still knows which row it is on.
 */
export const readAgeRating = (value = "", where: string): AgeRating =>
  isAgeRating(value) ? value : sheetError(where, `"${value}" is not an age rating`);

/**
 * Reads a genre cell, rejecting one nobody filled in.
 *
 * The vocabulary is open-ended — the shared ramp answers `NEUTRAL_FILL` off its table — so the only
 * thing checkable here is that a value is there at all. That is worth checking on its own: an empty
 * cell reaches every genre surface as a group with no name, drawing the same neutral an unrecognised
 * genre draws, so a row nobody finished is indistinguishable from a genre nobody has coloured yet.
 *
 * The default is what covers a row the sheet truncated: the API ends a row at its last filled cell,
 * so a half-entered row carries no `Genre` key at all rather than an empty one.
 */
export const readGenre = (value = "", where: string): string => value || sheetError(where, "no genre recorded");

/**
 * Reads a start/end pair, rejecting one recorded at two precisions.
 *
 * A span is logged as two full dates or as two bare years — one of each is a cell somebody
 * half-filled, and it is the one shape nothing downstream can do anything with: `daysTo` answers
 * `undefined` across mixed precision, so a duration silently disappears, while every chart that
 * plots the pair as a band has to place a year somewhere inside itself and guess.
 *
 * Asked once here because all three sheets record spans and each was answering differently — one
 * checking, one casting a `Year` to `YearMonthDay` and letting it reach a render, one not looking.
 * An absent end is not a mismatch: that is an item still in progress, which every domain models.
 */
export const readDatePair = <T extends PlainDate>(start: T, end: T | undefined, where: string): void => {
  if (end && start instanceof YearMonthDay !== end instanceof YearMonthDay) {
    sheetError(where, "one date is a bare year and the other is not");
  }
};
