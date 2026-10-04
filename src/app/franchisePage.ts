/**
 * Where a franchise's own page stands: under the Omnibus, so the path's first segment draws that
 * tab's chrome around it. One place for the pattern and the paths built to it, so a link and the
 * route cannot drift apart.
 */
export const FRANCHISE_ROUTE = "omnibus/franchise/:name";

/** The path to one franchise's page, its name encoded so a `/` or a `?` in it stays the name. */
export const franchisePath = (franchise: string) => `/omnibus/franchise/${encodeURIComponent(franchise)}`;
