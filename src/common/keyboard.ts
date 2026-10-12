import { useEffect, useEffectEvent } from "react";

/**
 * Whether a key press landed where typing already means something: a text field, a select or
 * anything editable. A page-wide shortcut stands down there, so a bare `/` stays a slash and Escape
 * stays the field's own.
 */
export const inEditableField = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

/**
 * Whether a modal layer stands over the page: a dialog, a drill-down, the box, a menu or a bottom
 * sheet. Every one of them is an MUI `Modal`, which marks its root with one class whatever it is
 * drawn as, and a closed one kept mounted with a second.
 *
 * Read off the document rather than off the press's target, because a layer that has lost its
 * focus — a hit's card mounted off-screen, a menu whose item was just pressed — still covers the
 * page, and a digit there taking the reader to another tab would change the page under a layer
 * that is still open over it. A menu answers letters itself, moving to the item they start.
 */
export const layerOpen = () => document.querySelector(".MuiModal-root:not(.MuiModal-hidden)") !== null;

/** One caller of `usePageKeys`: the keys it answers, and its answer as the latest render states it. */
interface PageKeys {
  keys: string;
  answer: (key: string) => boolean;
}

/**
 * Everyone answering a page key, behind one document listener.
 *
 * One listener rather than one per caller, so the tests below run once a press whoever is mounted —
 * and the document walk `layerOpen` makes runs only for a key somebody answers, never for the space
 * bar or an arrow on a wall of a thousand cards.
 */
const callers = new Set<PageKeys>();

/**
 * Answers a bare key pressed on the page itself.
 *
 * A chord is the browser's or the system's — ⌘1 switches the browser's tabs and ⌘[ goes back — so
 * every shortcut here is a bare key, judged by the character it types rather than by the keys held
 * to type it: Shift is how `?` is typed on most layouts, ⌥ is how a German or French Mac types `[`,
 * and AltGr — which Windows reports as Ctrl and Alt together — is how the same layouts type it
 * there. `event.key` already tells `j` from `J`, and ⌥ on a layout that has no use for it types a
 * character nobody answers (⌥J is `∆`), so neither needs refusing. ⌘ and a Ctrl that is not AltGr
 * are refused outright. A held key does not repeat:
 * every answer here moves the page, and a repeat rate moving it thirty times a second outruns the
 * render it is waiting on. A key taken is one the browser does not also act on — `j` scrolling a
 * page with a find-as-you-type setting, `/` opening the browser's own.
 */
const onPageKey = (event: KeyboardEvent) => {
  if (event.defaultPrevented || event.repeat || event.isComposing) return;
  const chord = event.metaKey || (event.ctrlKey && !event.getModifierState("AltGraph"));
  if (chord || event.key.length !== 1) return;
  const answering = [...callers].filter((caller) => caller.keys.includes(event.key));
  if (answering.length === 0 || inEditableField(event.target) || layerOpen()) return;
  if (answering.some((caller) => caller.answer(event.key))) event.preventDefault();
};

/**
 * Answers the bare keys in `keys`, one character each, for as long as the caller is mounted.
 *
 * `answer` returns whether it took the key. It is read as the press lands rather than subscribed
 * to, so it always sees the state of the latest render without the caller re-registering.
 */
export const usePageKeys = (keys: string, answer: (key: string) => boolean) => {
  const onKey = useEffectEvent((key: string) => answer(key));

  useEffect(() => {
    const caller = { keys, answer: onKey };
    if (callers.size === 0) document.addEventListener("keydown", onPageKey);
    callers.add(caller);
    return () => {
      callers.delete(caller);
      if (callers.size === 0) document.removeEventListener("keydown", onPageKey);
    };
  }, [keys]);
};

/** The index `delta` steps from `index` along a list of `length`, wrapping at either end. */
export const stepIndex = (index: number, delta: number, length: number) =>
  (((index + delta) % length) + length) % length;

/**
 * The modifier a chord here is written with: ⌘ on Apple's platforms, Ctrl elsewhere, the two every
 * chord the app answers accepts alike. Read when asked rather than at load, `navigator` being absent
 * wherever this module is imported outside a browser.
 */
export const modKey = () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl+");
