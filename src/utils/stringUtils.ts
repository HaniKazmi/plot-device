/**
 * Whether two titles name the same thing, ignoring a leading article and case.
 *
 * Both sheets record a franchise for every row and fall back to the title itself where there is
 * no wider series, so a card has to decide whether the franchise is worth a line of its own. Exact
 * equality is not enough: the two are typed independently and drift by an article — 43 films and
 * 36 shows pair a `The Chronicles of Narnia…` title with a `Chronicles of Narnia…` franchise, and
 * each would otherwise get a row repeating its own name back at the reader.
 *
 * Only equality is treated as the same thing. A franchise that is a *prefix* of the title is the
 * case worth keeping — `Harry Potter` under `Harry Potter and the Philosopher's Stone`, or
 * `Pirates of the Caribbean` under any of its four — so the comparison deliberately stops short
 * of matching those.
 */
export const namesTheSameThing = (a: string, b: string) => normaliseTitle(a) === normaliseTitle(b);

const normaliseTitle = (title: string) =>
  title
    .toLowerCase()
    .replace(/^the\s+/, "")
    .trim();
