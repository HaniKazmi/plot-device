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
