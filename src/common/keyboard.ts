/**
 * Whether a key press landed where typing already means something: a text field, a select or
 * anything editable. A page-wide shortcut stands down there, so a bare `/` stays a slash and Escape
 * stays the field's own.
 */
export const inEditableField = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};
