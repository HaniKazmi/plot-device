import { Layers, Timer, Update } from "@mui/icons-material";
import { Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useNavigate } from "react-router-dom";
import { CardPanel, type PanelStat, type PanelSubtitlePart, type TypedCardMediaImage } from "../common/Card";
import { CURRENT_PLAINDATE, CURRENT_YEAR, formatDate, type YearNumber } from "../common/date";
import type { YearType } from "../common/filterReducer";
import { Section, StatBand } from "../common/SectionRail";
import { TotalsBand, VitalsCard, YearTotals } from "../common/Stats";
import { genreToColour } from "../utils/types";
import MovieCardMediaImage from "../movie/CardMediaImage";
import { cinemaLabel } from "../movie/types";
import { movieHeroStats } from "../movie/statsData";
import ShowCardMediaImage from "../show/CardMediaImage";
import { showHeroStats } from "../show/statsData";
import VgCardMediaImage from "../vg/CardMediaImage";
import { heroStats } from "../vg/statsData";
import { genreToColour as vgGenreToColour } from "../vg/types";
import { MoviesTab, ShowsTab, VideoGamesTab, type Tab } from "../tabs";
import { electNow, hasNow, measureOf, unionTotals, type OmniItem } from "./adapter";
import type { FilterDispatch } from "./filterUtils";
import { OMNIBUS_SECTIONS } from "./sections";
import { media, mediumToColour, mediumToLabel, type Measure, type Medium } from "./types";

/**
 * How tall a Now card's artwork is. Height alone is fixed and the width is the artwork's own, so a
 * banner and a poster sit at one height in one row without either being cropped — the letterboxing
 * falls on the card's own sampled ground, which is what the three cards have in common anyway.
 */
const NOW_MEDIA_HEIGHT = 170;

const Stats = ({
  data,
  now,
  earliestYear,
  measure,
  yearType,
  yearTo,
  filterDispatch,
}: {
  data: OmniItem[];
  /** Computed by `Graphs`, which decides on the same value whether the rail offers a Now chip. */
  now: ReturnType<typeof electNow>;
  /** The union's own first year, so the select's floor does not rise with the filters. */
  earliestYear?: YearNumber;
  measure: Measure;
  yearType: YearType;
  yearTo: YearNumber;
  filterDispatch: FilterDispatch;
}) => {
  const totals = unionTotals(data);
  const inYear = unionTotals(data.filter((item) => item.year === yearTo));

  return (
    <Stack spacing={2}>
      {/* Nothing in flight anywhere and there is no "now" to lead with. */}
      {hasNow(now) && (
        <Section id={OMNIBUS_SECTIONS.now}>
          <Now now={now} />
        </Section>
      )}
      <Section id={OMNIBUS_SECTIONS.vitals}>
        <StatBand>
          {/* The year controls in these cards filter the whole page, and a control's effects flow
              down the page, never up — so the cards come before the band they redraw. */}
          <YearTotals
            yearTo={yearTo}
            yearType={yearType}
            filterDispatch={filterDispatch}
            icon={<Timer />}
            activeYearType="upto"
            earliestYear={earliestYear}
            stats={totals}
            renderValue={(value) => (
              <Typography variant="h6">{value == CURRENT_YEAR ? "All Time" : `Up To ${value}`}</Typography>
            )}
          />
          <YearTotals
            yearTo={yearTo}
            yearType={yearType}
            filterDispatch={filterDispatch}
            icon={<Update />}
            activeYearType="matching"
            minWidth={120}
            earliestYear={earliestYear}
            // The years figure is dropped: inside one year it can only ever read 1.
            stats={{ hours: inYear.hours, items: inYear.items }}
            renderValue={(value) => <Typography variant="h6">In {value}</Typography>}
          />
          <VitalsCard>
            <TotalsBand
              title="Media"
              icon={<Layers />}
              data={data}
              measureFunc={(items) => measureOf(items, measure)}
              group={[...media]}
              groupOf={(item) => item.medium}
              groupToColour={mediumToColour}
              groupToLabel={mediumToLabel}
              measureLabel={measure}
            />
          </VitalsCard>
        </StatBand>
      </Section>
    </Stack>
  );
};

/**
 * What each medium is on right now, side by side — the one view none of the three tabs can show,
 * and the reason the page opens with it rather than with a total.
 *
 * Each card is the domain's own: its artwork, its badge, and the figures its own hero carries, so
 * a game reads in hours and days and a season in episodes and pace. A medium with nothing in
 * flight simply contributes no card, rather than a card saying nothing.
 */
const Now = ({ now }: { now: ReturnType<typeof electNow> }) => {
  const navigate = useNavigate();

  // The jump the medium chip makes. Built from the tab objects rather than from written-out paths,
  // since the id *is* the route and only the registry should know that.
  const jump = (tab: Tab) => () => {
    navigate(`/${tab.id}`);
    window.scrollTo({ top: 0 });
  };

  return (
    <Grid
      container
      spacing={1}
      sx={{ alignItems: "stretch" }}
    >
      {now.game && (
        <NowCard
          item={now.game}
          medium="game"
          MediaComponent={VgCardMediaImage}
          onJump={jump(VideoGamesTab)}
          kicker={`Playing · since ${formatDate(now.game.startDate)}`}
          title={now.game.name}
          subtitle={[{ text: now.game.platform }, { text: now.game.genre, swatch: vgGenreToColour(now.game) }]}
          // The franchise tile is dropped by passing the game alone: the card strips this page
          // will grow are Phase C's, and a count taken from a second grouping here would be a
          // second answer to a question the cards below already answer.
          stats={heroStats(now.game, [now.game], CURRENT_PLAINDATE)}
        />
      )}
      {now.show && (
        <NowCard
          item={now.show}
          medium="show"
          MediaComponent={ShowCardMediaImage}
          onJump={jump(ShowsTab)}
          kicker={`Watching · last ${formatDate(now.show.show.lastWatchedDate!)}`}
          title={`${now.show.show.name} S${now.show.s}`}
          subtitle={[
            { text: now.show.show.network },
            { text: now.show.show.genre, swatch: genreToColour(now.show.show.genre) },
          ]}
          stats={showHeroStats(now.show, 1, CURRENT_PLAINDATE)}
        />
      )}
      {now.movie && (
        <NowCard
          item={now.movie}
          medium="movie"
          MediaComponent={MovieCardMediaImage}
          onJump={jump(MoviesTab)}
          kicker={`Latest watch · ${formatDate(now.movie.startDate)} · ${cinemaLabel(now.movie)}`}
          title={now.movie.name}
          subtitle={[{ text: now.movie.director }, { text: now.movie.genre, swatch: genreToColour(now.movie.genre) }]}
          stats={movieHeroStats(now.movie, 1)}
        />
      )}
    </Grid>
  );
};

/**
 * One medium's current item, at a third of the band.
 *
 * The corner chip names the medium in its own fill and is what carries the reader to that tab —
 * the artwork itself already opens the domain's expanded card, which is the other thing a reader
 * wants from it, and a card cannot do both from one surface.
 */
const NowCard = <T,>(props: {
  item: T;
  medium: Medium;
  MediaComponent: TypedCardMediaImage<T>;
  onJump: () => void;
  kicker: string;
  title: string;
  subtitle: PanelSubtitlePart[];
  stats: PanelStat[];
}) => (
  <Grid size={{ xs: 12, md: 4 }}>
    <props.MediaComponent
      item={props.item}
      extractColour
      chip={{ label: mediumToLabel(props.medium), colour: mediumToColour(props.medium), onClick: props.onJump }}
      sx={{
        height: NOW_MEDIA_HEIGHT,
        width: "100%",
        objectFit: "contain",
        display: "block",
      }}
      footerComponent={
        <CardPanel
          kicker={props.kicker}
          title={props.title}
          titleVariant="h6"
          subtitle={props.subtitle}
          stats={props.stats}
        />
      }
    />
  </Grid>
);

export default Stats;
