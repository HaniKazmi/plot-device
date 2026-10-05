import { Link } from "@mui/material";
import { useContext, type ReactNode } from "react";
import { FranchisePageContext } from "./franchiseUnion";

/**
 * A franchise named so that it leads to the franchise's own page, wherever it has one
 * (`FranchisePageContext`), and plain words where it has none.
 *
 * Underlined faintly at rest rather than only under a pointer, since a finger has no hover to
 * find it by, and in the ink around it, so a name on an artwork's ground keeps the card's own
 * tones. The press stops at the link: a name inside a card or a pressable row is asking for the
 * franchise and not for whatever the row around it opens.
 */
export const FranchiseLink = ({ franchise, children }: { franchise: string; children?: ReactNode }) => {
  const href = useContext(FranchisePageContext)(franchise);
  const words = children ?? franchise;
  if (!href) return words;

  return (
    <Link
      href={href}
      color="inherit"
      underline="always"
      onClick={(event) => {
        event.stopPropagation();
        // Only where the page in hand is the one being left: a modified or middle press opens the
        // franchise in a tab of its own and leaves this page where the reader had it.
        if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey)
          window.scrollTo({ top: 0 });
      }}
      sx={LINK_SX}
    >
      {words}
    </Link>
  );
};

const LINK_SX = {
  textDecorationColor: "color-mix(in srgb, currentColor 35%, transparent)",
  "@media (hover: hover)": { "&:hover": { textDecorationColor: "currentColor" } },
} as const;
