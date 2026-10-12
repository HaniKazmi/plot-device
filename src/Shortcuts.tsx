import { lazy, Suspense, useState } from "react";
import { usePageKeys } from "./common/keyboard";
import { closeShortcuts, openShortcuts, useShortcutsOpen } from "./common/shortcutsOpen";

/**
 * The sheet and everything it imports, loaded with their own chunk: the shell mounts this host on
 * every visit, and a sheet a reader opens once a month has no business in the first download.
 * Module scope, because the React Compiler cannot lower an import expression.
 */
const loadSheet = () => import("./ShortcutsSheet");
const ShortcutsSheet = lazy(loadSheet);

/**
 * `?` opens the sheet of every key the app answers, from anywhere a bare key reaches the page.
 *
 * The app draws no hover labels, so a key is learnt here or not at all. The host and the sheet live
 * beside the shell rather than in `app/` because the sheet names the tabs the digit keys open, and
 * `tabs.ts` is not a module the registry's folder may read.
 */
export const ShortcutsHost = () => {
  const open = useShortcutsOpen();
  // Latched on the first open, so the sheet's chunk is fetched by a reader who asks for it and
  // never before, and stays mounted to play its closing transition.
  const [asked, setAsked] = useState(false);
  usePageKeys("?", () => {
    openShortcuts();
    return true;
  });
  if (open && !asked) setAsked(true);

  if (!asked) return null;
  return (
    <Suspense fallback={null}>
      <ShortcutsSheet
        open={open}
        onClose={closeShortcuts}
      />
    </Suspense>
  );
};
