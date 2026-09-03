import { CardPanel, CardMediaImage, CardDetailBody, TypedCardMediaImage, type CardStat } from "../common/Card";
import { Season, Show, isShow } from "./types";
import { statusToColour, type Scheme } from "../utils/types";
import { useScheme } from "../common/useScheme";
import { CURRENT_PLAINDATE, YearMonthDay, formatDateRange } from "../common/date";
import { hoverCardArtworkSx } from "../common/cardArrangement";
import { FranchiseStrip, type StripVariant } from "../common/FranchiseStrip";
import { useFranchiseUnion, type FranchiseEntry } from "../common/franchiseUnion";
import { seasonEntry, seasonKey, showRows, showSubject, showSubtitle } from "./cardData";
import { useFranchiseShows } from "./franchiseContext";
import { seasonHours } from "./statsData";

/** The figures the card leads with: how much of the show there is, and whether it is still going. */
const showStats = (show: Show, scheme: Scheme): CardStat[] => [
  { label: "Seasons", value: show.s.length },
  { label: "Episodes", value: show.e },
  { label: "Hours", value: seasonHours(show.minutes) },
  { label: "Status", value: show.status, colour: statusToColour(show, scheme) },
];

const ShowCardDetail = ({ show, season }: { show: Show; season?: Season }) => {
  const scheme = useScheme();

  return (
    <CardDetailBody
      strip={
        <ShowFranchiseStrip
          show={show}
          season={season}
        />
      }
      stats={showStats(show, scheme)}
      rows={showRows(show, scheme)}
    />
  );
};

const ShowCardMediaImage = <T extends Show | Season>({ item, ...props }: Parameters<TypedCardMediaImage<T>>[0]) => {
  const show = isShow(item) ? item : item.show;
  // A season card is about that season; a show card is about the show, with its latest season
  // as the one the strip picks out.
  const season = isShow(item) ? undefined : (item as Season);

  return (
    <CardMediaImage
      alt={show.name}
      image={show.banner}
      detailComponent={() => (
        <ShowCardDetail
          show={show}
          season={season}
        />
      )}
      {...props}
    />
  );
};

const SHOW_EPOCH = YearMonthDay.get(2008, 1, 1);

/**
 * Every sibling's seasons in the strip's vocabulary, for the moment before the other three
 * libraries have landed, through the mapper the union draws with.
 */
const seasonEntries = (shows: Show[], today: YearMonthDay): FranchiseEntry[] =>
  shows.flatMap((show) => show.s.map((season) => seasonEntry(season, today, () => <ShowHoverCard item={season} />)));

/**
 * The show's franchise across every medium it was met in, with every season of this show as the
 * subject. A show outside any franchise names itself in the column, so its group is its own
 * seasons alone: those are drawn as a chain with no subject singled out, since ringing every bead
 * says nothing, and a single-season standalone draws nothing at all. The union answers once all
 * four libraries are here, and the tab's own index answers until then.
 */
/**
 * Every season of the show is the subject, and the season the card is about — or the latest,
 * for a card about the whole show — is the focus the strip rings harder.
 */
export const ShowFranchiseStrip = ({
  show,
  season,
  variant,
}: {
  show: Show;
  season?: Season;
  variant?: StripVariant;
}) => {
  const union = useFranchiseUnion(show.franchise);
  const own = useFranchiseShows(show);
  const entries = union ?? seasonEntries(own, CURRENT_PLAINDATE);

  if (entries.length < 2) return null;

  return (
    <FranchiseStrip
      entries={entries}
      subject={showSubject(show)}
      focus={seasonKey(season ?? show.s.at(-1)!)}
      franchise={show.franchise}
      epoch={SHOW_EPOCH}
      today={CURRENT_PLAINDATE}
      variant={variant}
    />
  );
};

/**
 * The card a hovered bar shows: the artwork, what was watched, when, and how much of it.
 *
 * A component rather than a shape each chart assembles, because the Omnibus shows the same card for
 * a season and a second assembly of it is a second thing to keep in step. `title` is the chart's own
 * label for the bar, so the card names exactly what was hovered — a season, or a whole show where
 * the seasons are combined.
 *
 * The subtitle carries the season's own name where the sheet gives it one, then the pair the tab's
 * hero says. Parts with no text are dropped, so a season without a name of its own simply reads
 * network and genre.
 */
export const ShowHoverCard = <T extends Show | Season>({ item, title }: { item: T; title?: string }) => {
  const scheme = useScheme();

  const show = isShow(item) ? item : item.show;

  return (
    <ShowCardMediaImage
      item={item}
      landscape
      extractColour
      sx={hoverCardArtworkSx("portrait")}
      footerComponent={
        <CardPanel
          layout="beside"
          title={title ?? (isShow(item) ? item.name : `${show.name} S${item.s}`)}
          subtitle={[{ text: isShow(item) ? "" : (item.subtitle ?? "") }, ...showSubtitle(show, scheme)]}
          dateRange={formatDateRange(item.startDate, item.endDate)}
          stats={[
            { value: item.e, label: "Eps" },
            { value: seasonHours(item.minutes), label: "Hours" },
          ]}
        />
      }
    />
  );
};

export default ShowCardMediaImage;
