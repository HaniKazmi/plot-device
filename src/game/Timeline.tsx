import { useState } from "react";
import { VideoGame, groupToColour } from "./types";
import { TimelineSection } from "../common/TimelineSection";
import { SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import { useColourBy } from "../common/useColourBy";
import { groupMarks, type PicturePress, type TimelineData } from "../common/timelineLayout";
import { CURRENT_PLAINDATE, type YearNumber } from "../common/date";
import { pictureAtHeight } from "../common/cardArrangement";
import type { YearType } from "../common/filterReducer";
import { stated } from "../common/population";
import GameCardMediaImage, { GameHoverCard } from "./CardMediaImage";
import { spanKey } from "./cardData";
import { gameGroupValue } from "./statsData";
import { pageState } from "./filterUtils";

/**
 * What the timeline can be coloured by: every key the tab's own `groupToColour` answers, in the
 * order the tab reads a game — its company first, as the wall's border and the platform charts
 * draw it, then what it is, how it plays and how it was had.
 */
const COLOUR_KEYS = [
  "company",
  "genre",
  "gameplay",
  "status",
  "format",
  "certificate",
  "style",
  "decade",
  "franchise",
] as const;

/** What one bar stands for: a playthrough, or a franchise with its games combined. */
type Bar = "game" | "franchise";

const BARS: readonly SegmentOption<Bar>[] = [
  { value: "game", label: "Games" },
  { value: "franchise", label: "Franchises" },
];

const pictureOf = (game: VideoGame) => (height: number, press: PicturePress) => (
  <GameCardMediaImage
    item={game}
    landscape
    lazy
    sx={pictureAtHeight("banner", height)}
    {...press}
  />
);

const GameTimeline = ({ data, yearType, yearTo }: { data: VideoGame[]; yearType: YearType; yearTo: YearNumber }) => {
  const colour = useColourBy(
    COLOUR_KEYS,
    "company",
    (game: VideoGame, key, scheme) => groupToColour(key, game, scheme),
    (game, key) => gameGroupValue(game, key),
  );
  const [bar, setBar] = useState<Bar>("game");

  const markOf = (game: VideoGame): TimelineData => ({
    // The strip's own identity for a game, which already carries the platform and the start date
    // because a replay and a cross-platform second copy both repeat the title exactly.
    key: spanKey(game),
    name: game.name,
    tooltip: () => <GameHoverCard item={game} />,
    colour: colour.fill(game),
    start: game.startDate,
    end: game.endDate ?? CURRENT_PLAINDATE,
    open: !game.endDate,
    picture: pictureOf(game),
  });
  // Under Franchises a series is one bar from its first start to its last finish, coloured by the
  // game that opened it and opening the card of the one met last; a game in no franchise stays a
  // bar of its own.
  const franchises = bar === "franchise" ? groupMarks(data, markOf, (game) => game.franchise) : undefined;
  const bars = franchises ? franchises.map(({ mark }) => mark) : data.map(markOf);

  return (
    <TimelineSection
      title={bar === "game" ? "Every playthrough" : "Every franchise"}
      // A bar per franchise is a population nothing else on the tab counts; a bar per game is the
      // page's own, already on the rail's chip.
      count={franchises ? stated(bars.length, "franchises") : undefined}
      data={bars}
      controls={
        <>
          <SegmentedControl
            options={BARS}
            value={bar}
            onChange={setBar}
            ariaLabel="One bar per"
          />
        </>
      }
      // The games whose colours the bars wear, which is what the key names.
      colourKey={colour.colourKey(franchises ? franchises.map(({ lead }) => lead) : data)}
      yearType={yearType}
      yearTo={yearTo}
      dispatch={pageState.dispatch}
      shape="banner"
    />
  );
};

export default GameTimeline;
