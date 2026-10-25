import { matchPath } from "react-router-dom";

/**
 * Where a franchise's own page stands: under the Omnibus, so the path's first segment draws that
 * tab's chrome around it. One place for the pattern and the paths built to it, so a link and the
 * route cannot drift apart.
 */
export const FRANCHISE_ROUTE = "omnibus/franchise/:name";

/** The path to one franchise's page, its name encoded so a `/` or a `?` in it stays the name. */
export const franchisePath = (franchise: string) => `/omnibus/franchise/${encodeURIComponent(franchise)}`;

/**
 * The franchise whose page a path is, named as the page itself receives it; `undefined` off one.
 *
 * The router decodes a path before matching its routes and `matchPath` decodes nothing, so read
 * raw, "Star Wars" arrives as `Star%20Wars` and names no franchise. Each segment is decoded with
 * its own slashes held back as `%2F`, which `matchPath` turns into a `/` inside the name — the
 * router's own order, so a franchise called "AC/DC" is one segment and one name here as there. A
 * malformed escape is left as written, as the router leaves it.
 */
export const franchiseAt = (pathname: string): string | undefined => {
  let decoded = pathname;
  try {
    decoded = pathname
      .split("/")
      .map((segment) => decodeURIComponent(segment).replace(/\//g, "%2F"))
      .join("/");
  } catch {
    // Left as written.
  }
  return matchPath(FRANCHISE_ROUTE, decoded)?.params.name;
};
