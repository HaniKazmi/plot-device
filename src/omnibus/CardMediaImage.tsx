import { type TypedCardMediaImage } from "../common/Card";
import MovieCardMediaImage, { MovieHoverCard } from "../movie/CardMediaImage";
import type { Movie } from "../movie/types";
import ShowCardMediaImage, { ShowHoverCard } from "../show/CardMediaImage";
import type { Season } from "../show/types";
import VgCardMediaImage, { VgHoverCard } from "../vg/CardMediaImage";
import type { VideoGame } from "../vg/types";
import { type OmniItem } from "./adapter";
import { mediumToShape } from "./types";

/**
 * One item of the union as its own tab's card.
 *
 * Everything a card can be asked for is forwarded untouched, so a surface here builds a mixed-media
 * list exactly the way a domain builds a single-medium one — the artwork opens the domain's own
 * expanded dialog, strip and ledger included, rather than a second and poorer copy of it. The three
 * franchise indexes are provided above this tab, so those strips answer with the whole series. The
 * artwork's shape comes with the card too, so a banner in a mixed row stacks its words and a poster
 * seats them beside without this adapter deciding anything.
 *
 * `source` is cast rather than narrowed: it is a union of three records TypeScript cannot tell
 * apart by shape, and `medium` is the discriminant the item already carries.
 */
const OmniCardMediaImage: TypedCardMediaImage<OmniItem> = ({ item, ...props }) => {
  // What the card is reserved at and arranged by. Passed here rather than set inside each domain's
  // component, so a home tab — every card of which is one shape already — keeps the layout its own
  // page was drawn for and only this tab's mixed rows arrange themselves per item.
  const shape = mediumToShape(item.medium);

  switch (item.medium) {
    case "game":
      return (
        <VgCardMediaImage
          item={item.source as VideoGame}
          shape={shape}
          {...props}
        />
      );
    case "show":
      return (
        <ShowCardMediaImage
          item={item.source as Season}
          shape={shape}
          {...props}
        />
      );
    case "movie":
      return (
        <MovieCardMediaImage
          item={item.source as Movie}
          shape={shape}
          {...props}
        />
      );
  }
};

/**
 * One item of the union as its own tab's hover card.
 *
 * The three domains' own components, rendered untouched. A panel assembled here instead is a second
 * card for the same item, free to state different figures from the one its home tab shows — and,
 * because this tab's cards also declare an artwork shape, to arrange them differently, stretching a
 * show's card out of the proportions its own tab draws it at. Dispatching to the domain leaves
 * nothing here that can disagree.
 *
 * `source` is cast rather than narrowed for the reason above: TypeScript cannot tell the three
 * records apart by shape, and `medium` is the discriminant the item already carries.
 */
export const OmniHoverCard = ({ item }: { item: OmniItem }) => {
  switch (item.medium) {
    case "game":
      return <VgHoverCard item={item.source as VideoGame} />;
    case "show":
      return <ShowHoverCard item={item.source as Season} />;
    case "movie":
      return <MovieHoverCard item={item.source as Movie} />;
  }
};

export default OmniCardMediaImage;
