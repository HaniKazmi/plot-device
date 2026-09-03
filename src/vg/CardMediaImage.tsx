import {
  CardPanel,
  type PanelStat,
  CardMediaImage,
  CardDetailBody,
  TypedCardMediaImage,
  type CardStat,
} from "../common/Card";
import { VideoGame } from "./types";
import { mediumFills, statusToColour, type Scheme } from "../utils/types";
import { useScheme } from "../common/useScheme";
import { CURRENT_PLAINDATE, Year, YearMonthDay, formatDateRange } from "../common/date";
import { hoverCardArtworkSx } from "../common/cardArrangement";
import { FranchiseStrip, type StripMode } from "../common/FranchiseStrip";
import { useFranchiseUnion, type FranchiseEntry } from "../common/franchiseUnion";
import { gameKey, gameRows, gameSubtitle } from "./cardData";
import { useFranchiseGames } from "./franchiseContext";

/**
 * The figures the card leads with. Each is conditional on the sheet holding it: an in-progress
 * game may have no hours logged, and a game logged with a bare year cannot be counted days into.
 *
 * Zero is unrecorded rather than a measurement in both, which is why the test is truthiness: a
 * tile reading zero hours says the game was played for none, where saying nothing says the truth.
 */
const gameStats = (game: VideoGame, scheme: Scheme): CardStat[] => {
  const stats: CardStat[] = [];

  if (game.hours) stats.push({ label: "Hours", value: game.hours });
  if (game.numDays) stats.push({ label: "Days To Beat", value: game.numDays });
  stats.push({ label: "Status", value: game.status, colour: statusToColour(game, scheme) });

  return stats;
};

const VgCardDetail = ({ item }: { item: VideoGame }) => {
  const scheme = useScheme();

  return (
    <CardDetailBody
      strip={<GameFranchiseStrip game={item} />}
      stats={gameStats(item, scheme)}
      rows={gameRows(item, scheme)}
    />
  );
};

const VgCardMediaImage: TypedCardMediaImage<VideoGame> = ({ item, ...props }) => (
  <CardMediaImage
    alt={item.name}
    image={item.banner}
    detailComponent={() => <VgCardDetail item={item} />}
    {...props}
  />
);

const VG_EPOCH = YearMonthDay.get(2004, 1, 1);

/**
 * The tab's own franchise in the strip's vocabulary, for the moment before the other three
 * libraries have landed. A year-only start spans its whole year with imprecise edges, as the union
 * draws it, so the strip does not change shape when the union arrives.
 */
const gameEntries = (games: VideoGame[], today: YearMonthDay): FranchiseEntry[] =>
  games.map((game) => ({
    key: gameKey(game),
    subject: gameKey(game),
    franchise: game.franchise,
    medium: "game",
    fill: mediumFills.game,
    label: game.name,
    start: game.startDate.firstDay(),
    end: game.endDate ? game.endDate.lastDay() : today,
    precise: !(game.startDate instanceof Year) && !(game.endDate instanceof Year),
    hoverCard: () => <VgHoverCard item={game} />,
  }));

/**
 * The game's franchise across every medium it was met in, with this game as the subject; nothing
 * for a standalone. The union answers once all four libraries are here, and the tab's own index
 * answers until then, so a card opened in the first second of a visit still has its series.
 */
export const GameFranchiseStrip = ({ game, mode }: { game: VideoGame; mode?: StripMode }) => {
  const union = useFranchiseUnion(game.franchise);
  const own = useFranchiseGames(game);
  const entries = union ?? gameEntries(own, CURRENT_PLAINDATE);

  if (entries.length < 2) return null;

  return (
    <FranchiseStrip
      entries={entries}
      subject={gameKey(game)}
      franchise={game.franchise}
      epoch={VG_EPOCH}
      today={CURRENT_PLAINDATE}
      mode={mode}
    />
  );
};

/**
 * The figures a hover card carries, each only where the sheet holds it. Zero is unrecorded rather
 * than a measurement, which is why the test is truthiness: a tile reading zero hours says the game
 * was played for none, where saying nothing says the truth.
 */
const gameHoverStats = ({ hours, numDays }: VideoGame): PanelStat[] => {
  const stats: PanelStat[] = [];

  if (hours) stats.push({ value: hours, label: "Hours" });
  if (numDays) stats.push({ value: numDays, label: "Days" });

  return stats;
};

/**
 * The card a hovered bar shows: the artwork, what the game is, when it ran, how much of it there
 * was.
 *
 * A component rather than a shape each chart assembles, because the Omnibus shows the same card for
 * a game and a second assembly of it is a second thing to keep in step — one that can come to carry
 * different figures or a different arrangement from this one.
 */
export const VgHoverCard = ({ item }: { item: VideoGame }) => {
  const scheme = useScheme();

  return (
    <VgCardMediaImage
      item={item}
      extractColour
      sx={hoverCardArtworkSx("landscape")}
      footerComponent={
        <CardPanel
          title={item.name}
          subtitle={gameSubtitle(item, scheme)}
          dateRange={formatDateRange(item.startDate, item.endDate)}
          stats={gameHoverStats(item)}
        />
      }
    />
  );
};

export default VgCardMediaImage;
