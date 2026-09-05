import { useState } from "react";

/**
 * A dialog's open flag, plus a mounted flag that lags it on close.
 *
 * The pair exists because the two answers a dialog needs are not the same answer. `open` is what
 * MUI animates on; `mounted` is whether the body is built at all, and it has to outlast `open` by
 * the length of the exit transition or the dialog closes on an empty box. `onExited` is the only
 * thing that knows when that is over, so it is handed back with the flags rather than left to each
 * caller to wire.
 *
 * What a caller gates with `mounted` is its own: a card gates the whole `Dialog` element, because
 * an uncapped wall mounts one per item and a closed `Dialog` still renders itself, its `Modal` and
 * their hooks before returning null; a card that keeps one `Dialog` gates only the body inside it.
 * Mounting a dialog already open still animates, since `Dialog` passes `appear` to its transition.
 *
 * A hook in a module of its own rather than beside either caller: a hook exported from a file of
 * components is a hot-reload boundary the lint rules refuse.
 *
 * `initiallyOpen` seats the dialog open from the first render, for a caller that mounts a card in
 * order to show its dialog — a search hit opening the expanded card its artwork would. Read once:
 * a flag flipped later opens nothing, which is what `show` is for.
 */
export const useDialogMount = (initiallyOpen = false) => {
  const [open, setOpen] = useState<boolean>(initiallyOpen);
  const [mounted, setMounted] = useState<boolean>(initiallyOpen);

  return {
    open,
    mounted,
    show: () => {
      setOpen(true);
      setMounted(true);
    },
    hide: () => setOpen(false),
    onExited: () => setMounted(false),
  };
};
