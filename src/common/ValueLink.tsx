import { Link } from "@mui/material";
import { useContext, type MouseEvent, type ReactNode } from "react";
import { FRANCHISE_KEY } from "./filterSchema";
import { FranchisePageContext } from "./franchiseUnion";
import { openValue } from "./valueLayer";

/**
 * Names that lead somewhere: a franchise to its own page, any other value of a filter category to
 * the layer of everything carrying it. Both wear one look — underlined faintly at rest rather than
 * only under a pointer, since a finger has no hover to find it by, and in the ink around it, so a
 * name on an artwork's ground keeps the card's own tones — and both stop their press there: a name
 * inside a card or a pressable row is asking for itself and not for whatever the row opens.
 */
const LINK_SX = {
  textDecorationColor: "color-mix(in srgb, currentColor 35%, transparent)",
  "@media (hover: hover)": { "&:hover": { textDecorationColor: "currentColor" } },
} as const;

/** The look on a button, which otherwise brings its own type, alignment and baseline. */
const BUTTON_LINK_SX = { ...LINK_SX, font: "inherit", textAlign: "inherit", verticalAlign: "baseline" } as const;

/** What every name-as-link shares, beside its press and its look. */
const LINK_PROPS = { color: "inherit", underline: "always" } as const;

/**
 * A franchise named so that it leads to the franchise's own page, wherever it has one
 * (`FranchisePageContext`), and plain words where it has none.
 */
export const FranchiseLink = ({ franchise, children }: { franchise: string; children?: ReactNode }) => {
  const pages = useContext(FranchisePageContext);
  const href = pages.href(franchise);
  const words = children ?? franchise;
  if (!href) return words;

  return (
    <Link
      href={href}
      {...LINK_PROPS}
      onClick={(event) => {
        event.stopPropagation();
        // A modified or middle press is the browser's, opening the franchise in a tab of its own
        // and leaving this page where the reader had it.
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        pages.open(franchise);
      }}
      sx={LINK_SX}
    >
      {words}
    </Link>
  );
};

/**
 * A value of a filter category — a genre, a platform, a director — named so that it opens the
 * layer of everything carrying it (`openValue`), the one the search box opens for that value when
 * it is typed. A button rather than an address, since what it opens is a layer over the page and
 * not a place.
 */
export const AttributeLink = ({
  category,
  value,
  children,
}: {
  category: string;
  value: string;
  children?: ReactNode;
}) => (
  <Link
    component="button"
    type="button"
    {...LINK_PROPS}
    onClick={(event: MouseEvent) => {
      event.stopPropagation();
      openValue(category, value);
    }}
    sx={BUTTON_LINK_SX}
  >
    {children ?? value}
  </Link>
);

/** A value of any category named as its way in: a franchise to its page, anything else to its layer. */
export const ValueLink = ({ category, value, children }: { category: string; value: string; children?: ReactNode }) =>
  category === FRANCHISE_KEY ? (
    <FranchiseLink franchise={value}>{children}</FranchiseLink>
  ) : (
    <AttributeLink
      category={category}
      value={value}
    >
      {children}
    </AttributeLink>
  );
