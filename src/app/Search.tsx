import { lazy, Suspense, useEffect } from "react";
import { closeSearch, openSearch, toggleSearchMode, useSearchState } from "../common/searchOpen";

/**
 * The box and everything it opens, loaded with their own chunk rather than the shell's.
 *
 * This host mounts above every tab, so what it imports at module scope is in the first bundle a
 * visitor downloads; the surface imports the four domains' cards, their filter schemas' drawing
 * surface and the drill-down grid, which live in the tabs' lazy chunks. The download starts on
 * mount all the same, since a box that arrives a second after ⌘K is a box that swallowed the first
 * letters. Module scope rather than inside the component, because the React Compiler cannot lower
 * an import expression.
 */
const loadSurface = () => import("./SearchSurface");
const SearchSurface = lazy(() => loadSurface().then((module) => ({ default: module.SearchSurface })));

/** Whether a key press landed where typing already means something, so a bare `/` stays a slash. */
const inEditableField = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

/**
 * Whether the press came from inside the box's own field, which is what makes ⌘K a toggle.
 *
 * Read off an attribute the field carries rather than off its accessible name: the name says which
 * of the two modes the box is in, so a rule keyed on it would stop recognising the box the moment
 * the reader switched to This page.
 */
const inSearchBox = (target: EventTarget | null) =>
  target instanceof HTMLElement && target.dataset.searchInput !== undefined;

/**
 * The app's box, mounted once in the shell inside the union provider.
 *
 * Reads the open flag and the mode from their store, so the button in the app bar, the rail's own
 * chips and the shortcuts here reach one box without a flag lifted through the tree.
 *
 * ⌘K and Ctrl+K open it in Find from anywhere and put the caret in it even where it is open
 * already, since whatever a hit opened may have taken the focus with it; from inside the field
 * they close it instead, the way a palette's own chord reads as a toggle. `/` opens Find too,
 * except in a field where a slash is a character — the box's own field included, which is what
 * `inEditableField` already answers for every input in the app. ⌘⇧K switches which mode the box is
 * in, opening it in the other one where it is closed, so the page's own filters have a chord as
 * well as the two chips.
 *
 * The surface is mounted for the life of the page once first opened — it holds the query and
 * whatever a hit opened — and never before, so a visitor who never searches pays only the prefetch.
 */
export const SearchHost = () => {
  const { open, mode, request, scope } = useSearchState();

  useEffect(() => {
    void loadSurface().catch(() => {});
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const chord = event.metaKey || event.ctrlKey;
      const k = chord && event.key.toLowerCase() === "k";
      const slash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (k && event.shiftKey) {
        // Tested before the bare chord, which the same press would otherwise answer as ⌘K.
        event.preventDefault();
        toggleSearchMode();
      } else if (k) {
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
        mode={mode}
        focusRequest={request}
        scope={scope}
      />
    </Suspense>
  );
};
