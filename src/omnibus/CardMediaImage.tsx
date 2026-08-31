import { CardPanel, type PanelLayout, type TypedCardMediaImage } from "../common/Card";
import { formatDate, formatDateRange } from "../common/date";
import MovieCardMediaImage from "../movie/CardMediaImage";
import type { Movie } from "../movie/types";
import ShowCardMediaImage from "../show/CardMediaImage";
import type { Season } from "../show/types";
import VgCardMediaImage from "../vg/CardMediaImage";
import type { VideoGame } from "../vg/types";
import { omniTitle, type OmniItem } from "./adapter";
import { mediumToAspect } from "./types";

/**
 * One item of the union as its own tab's card.
 *
 * Everything a card can be asked for is forwarded untouched, so a surface here builds a mixed-media
 * list exactly the way a domain builds a single-medium one — the artwork opens the domain's own
 * expanded dialog, strip and ledger included, rather than a second and poorer copy of it. The three
 * franchise indexes are provided above this tab, so those strips answer with the whole series.
 *
 * `source` is cast rather than narrowed: it is a union of three records TypeScript cannot tell
 * apart by shape, and `medium` is the discriminant the item already carries.
 */
const OmniCardMediaImage: TypedCardMediaImage<OmniItem> = ({ item, sx, ...props }) => {
  // The shape the artwork is reserved at before it loads, per item rather than per wall. A lazy
  // image contributes no width of its own, so a strip of them starts collapsed and its scroll
  // width lies about how much is in it — the horizontal form of the height problem the library
  // grid reserves against. `auto` first keeps it a reservation: the real shape wins the moment it
  // is known. Listed before the caller's own `sx` so a caller can still override it.
  const shape = [{ aspectRatio: mediumToAspect(item.medium) }, ...(Array.isArray(sx) ? sx : [sx])];

  switch (item.medium) {
    case "game":
      return (
        <VgCardMediaImage
          item={item.source as VideoGame}
          sx={shape}
          {...props}
        />
      );
    case "show":
      return (
        <ShowCardMediaImage
          item={item.source as Season}
          sx={shape}
          {...props}
        />
      );
    case "movie":
      return (
        <MovieCardMediaImage
          item={item.source as Movie}
          sx={shape}
          {...props}
        />
      );
  }
};

/**
 * The panel beside a mixed-media card: what the item is, when it ran, and how much of it there was,
 * each medium in the figures its own tab keeps it in.
 *
 * Hours are not the unit here even though the page's measure is: a film is minutes and a season is
 * episodes, and a card is where a medium is allowed to speak for itself. The comparison the page
 * exists to make is made in the charts above, on the union's own vocabulary.
 */
export const OmniCardPanel = ({ item, layout }: { item: OmniItem; layout: PanelLayout }) => {
  switch (item.medium) {
    case "game": {
      const game = item.source as VideoGame;
      return (
        <CardPanel
          layout={layout}
          title={game.name}
          subtitle={game.platform}
          dateRange={formatDateRange(game.startDate, game.endDate)}
          stats={game.hours ? [{ value: game.hours, label: "Hours" }] : []}
        />
      );
    }
    case "show": {
      const season = item.source as Season;
      return (
        <CardPanel
          layout={layout}
          title={omniTitle(item)}
          subtitle={season.show.network}
          dateRange={formatDateRange(season.startDate, season.endDate)}
          stats={[
            { value: season.e, label: "Eps" },
            { value: Math.floor(season.minutes / 60), label: "Hours" },
          ]}
        />
      );
    }
    case "movie": {
      const movie = item.source as Movie;
      return (
        <CardPanel
          layout={layout}
          title={movie.name}
          subtitle={movie.director}
          dateRange={formatDate(movie.startDate)}
          stats={[{ value: movie.minutes, label: "Min" }]}
        />
      );
    }
  }
};

export default OmniCardMediaImage;
