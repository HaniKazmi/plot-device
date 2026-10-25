import { matchRoutes } from "react-router-dom";

/**
 * Where a franchise's own page stands: under the Omnibus, so the path's first segment draws that
 * tab's chrome around it. One place for the pattern and the paths built to it, so a link and the
 * route cannot drift apart.
 */
export const FRANCHISE_ROUTE = "omnibus/franchise/:name";

/** The path to one franchise's page, its name encoded so a `/` or a `?` in it stays the name. */
export const franchisePath = (franchise: string) => `/omnibus/franchise/${encodeURIComponent(franchise)}`;

const FRANCHISE_ROUTES = [{ path: FRANCHISE_ROUTE }];

/**
 * The franchise whose page a path is, named as the page itself receives it; `undefined` off one.
 *
 * Through `matchRoutes`, which decodes the path before matching as the router does for the page:
 * `matchPath` decodes nothing, so read through it "Star Wars" arrives as `Star%20Wars` and names no
 * franchise.
 */
export const franchiseAt = (pathname: string): string | undefined =>
  matchRoutes(FRANCHISE_ROUTES, pathname)?.[0]?.params.name;
