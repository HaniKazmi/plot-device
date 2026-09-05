import type { Library } from "../../src/app/library";

/**
 * A whole `Library`, every domain empty unless overridden, for tests that build the union.
 *
 * One builder rather than one per test file: every field on `Library` is required, so a domain
 * added to the union breaks this one place at once rather than each copy in turn.
 */
export const library = (overrides: Partial<Library> = {}): Library => ({
  game: [],
  show: [],
  movie: [],
  book: [],
  ...overrides,
});
