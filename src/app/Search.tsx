import { lazy, Suspense, useEffect } from "react";
import { closeSearch, openSearch, useSearchState } from "../common/searchOpen";

/**
 * The palette and everything it opens, loaded with their own chunk rather than the shell's.
 *
 * This host mounts above every tab, so what it imports at module scope is in the first bundle a
 * visitor downloads; the surface imports the four domains' cards and the drill-down grid, which
 * live in the tabs' lazy chunks. The download starts on mount all the same, since a search box
 * that arrives a second after ⌘K is a box that swallowed the first letters. Module scope rather
 * than inside the component, because the React Compiler cannot lower an import expression.
 */
const loadSurface = () => import("./SearchSurface");
const SearchSurface = lazy(() => loadSurface().then((module) => ({ default: module.SearchSurface })));

/** Whether a key press landed where typing already means something, so a bare `/` stays a slash. */
const inEditableField = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

/** Whether the press came from inside the palette's own box, which is what makes ⌘K a toggle. */
const inSearchBox = (target: EventTarget | null) =>
  target instanceof HTMLElement && target.getAttribute("aria-label") === "Search" && target.tagName === "INPUT";

/**
 * The app's search, mounted once in the shell inside the union provider.
 *
 * Reads the open flag from its store, so the button in the app bar and the shortcut here reach
 * one palette without a flag lifted through the tree. ⌘K and Ctrl+K open it from anywhere and
 * put the caret in the box even where it is open already, since whatever a hit opened may have
 * taken the focus with it; from inside the box they close it instead, the way a palette's own
 * chord reads as a toggle. `/` opens it too, except in a field where a slash is a character. The
 * surface is mounted for the life of the page once first opened — it holds the query and
 * whatever a hit opened — and never before, so a visitor who never searches pays only the
 * prefetch.
 */
export const SearchHost = () => {
  const { open, request } = useSearchState();

  useEffect(() => {
    void loadSurface().catch(() => {});
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const palette = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const slash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (palette) {
        event.preventDefault();
        if (inSearchBox(event.target)) closeSearch();
        else openSearch();
      } else if (slash && !inEditableField(event.target)) {
        event.preventDefault();
        openSearch();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Mounted from the first request on: the store's count says whether the box was ever asked for,
  // so no flag has to be latched in an effect.
  if (request === 0) return null;
  return (
    <Suspense fallback={null}>
      <SearchSurface
        open={open}
        focusRequest={request}
      />
    </Suspense>
  );
};
