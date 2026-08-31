import { Hub, Layers, Timer, Update } from "@mui/icons-material";
import { Box, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { CardPanel, type PanelStat, type PanelSubtitlePart, type TypedCardMediaImage } from "../common/Card";
import { CURRENT_PLAINDATE, CURRENT_YEAR, formatDate, type YearNumber } from "../common/date";
import type { YearType } from "../common/filterReducer";
import { Section, StatBand } from "../common/SectionRail";
import { StatCard, TotalsBand, VitalsCard, YearTotals } from "../common/Stats";
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
import { crossingEntries, type Crossing } from "./crossingsData";
import type { FilterDispatch } from "./filterUtils";
import { OMNIBUS_SECTIONS } from "./sections";
import { media, mediumToColour, mediumToLabel, mediumToShape, type Measure, type Medium } from "./types";
import { shapeRatioValues, shapeToRatio } from "../common/cardArrangement";

const Stats = ({
  data,
  now,
  crossings,
  earliestYear,
  measure,
  yearType,
  yearTo,
  filterDispatch,
}: {
  data: OmniItem[];
  /** Computed by `Graphs`, which decides on the same value whether the rail offers a Now chip. */
  now: ReturnType<typeof electNow>;
  /** The same list the Crossings section draws, so the count and the strips cannot disagree. */
  crossings: Crossing[];
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
          {/* The one figure on this page that could not be read off any of the three tabs: a
              franchise is only a crossing when more than one of them holds it. */}
          <StatCard
            icon={<Hub />}
            title="Crossings"
            content={[
              ["Franchises", crossings.length],
              ["Entries", crossingEntries(crossings)],
            ]}
          />
        </StatBand>
      </Section>
      {/* This file holds the bands above the charts and nothing else. The browse surfaces — the
          gallery and recently finished — belong to `Graphs`, at the `OMNIBUS_SECTIONS.gallery`
          and `.finished` anchors. */}
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
    <Box
      sx={{
        display: "flex",
        // Stacked on a phone, where a card is the screen's width and there is no row to be part of.
        flexDirection: { xs: "column", md: "row" },
        // A row of one height with the widths following, which is how every strip on this page
        // holds mixed artwork: an equal-thirds grid gives each card a width it did not ask for, and
        // the two shapes then reach that width at different heights. Sharing the height and letting
        // the widths differ is the same trade the other way round, and it is the one that leaves
        // every picture whole — a poster card comes out near-square and a banner card wider.
        flexWrap: { md: "wrap" },
        alignItems: "stretch",
        gap: 1,
      }}
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
          // The franchise tile is dropped by passing the game alone. The Crossings section is
          // where this page states what a franchise spans, and it is drawn from the filtered
          // union — while the hero is elected from the library and the filters do not narrow it,
          // so a tile here would quote a number that moves under a control the card ignores.
          stats={heroStats(now.game, [now.game], CURRENT_PLAINDATE)}
        />
      )}
      {now.show && (
        <NowCard
          item={now.show}
          medium="show"
          MediaComponent={ShowCardMediaImage}
          onJump={jump(ShowsTab)}
          kicker={`Last watched · ${formatDate(now.show.show.lastWatchedDate!)}`}
          title={`${now.show.show.name} S${now.show.s}`}
          subtitle={[
            { text: now.show.show.network },
            { text: now.show.show.genre, swatch: genreToColour(now.show.show.genre) },
          ]}
          // The rate tile stays on the Shows tab's own hero; beside a poster this card's text
          // column holds two figures comfortably and three crowd it.
          stats={showHeroStats(now.show, 1, CURRENT_PLAINDATE).filter((stat) => stat.label !== "Eps / Week")}
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
    </Box>
  );
};

/**
 * The band's geometry: one height for the row, and a width per card that follows from it.
 *
 * The widths are stated rather than left to the artwork's own pixels for two reasons. A flex row
 * asks an item how wide it wants to be before any height is known, and a picture asked that answers
 * with its file's width — a 680px poster then claims 680px and drags the row past 1,000 tall. And a
 * file that is off its declared ratio would stand the two poster cards at different sizes for a
 * reason no reader can see.
 *
 * The numbers hold each other, and the height is what they are all measured against:
 *
 * - a poster card is a full-height poster — the height at the poster's own ratio — plus its text;
 * - the banner card is the height too, spent the other way round: its picture spans the card, so the
 *   card's width is what decides how much of the height the picture takes and how much is left for
 *   the words. Sizing the card from that leftover rather than picking a width is what makes the
 *   banner card come out exactly the row's height, so no card carries a strip of ground its
 *   neighbours do not;
 * - together they come to 1,231px, which is what lets all three stand on one row at a desktop width
 *   rather than wrapping.
 */
const NOW_HEIGHT = 380;
const NOW_TEXT_WIDTH = 185;

/**
 * What the banner card's words come to: the panel's own lines, with its lower padding given up.
 *
 * A card that ends in padding ends in a band of ground, and this one is the only card in the row
 * with an edge below its text to spend — the poster cards end in a picture. Handing it to the
 * banner instead is what makes the picture the full width of the row's tallest possible card rather
 * than that minus a margin nothing is printed in.
 */
const NOW_BANNER_TEXT_HEIGHT = 195;

/**
 * The banner card is as wide as its picture needs to be to take the rest of the height at 16:9.
 * Stated this way round, the card cannot come out taller than the row and leave a hairline of ground
 * under the posters beside it.
 */
const NOW_BANNER_CARD_WIDTH = Math.round((NOW_HEIGHT - NOW_BANNER_TEXT_HEIGHT) * shapeRatioValues.landscape);
const NOW_POSTER_ART_WIDTH = Math.round(NOW_HEIGHT * shapeRatioValues.portrait);

/**
 * One medium's current item.
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
}) => {
  const shape = mediumToShape(props.medium);
  const beside = shape === "portrait";

  return (
    <Box
      sx={{
        flex: "0 0 auto",
        // Each card the width its own picture makes it, rather than every card a third of the band.
        width: { xs: "100%", md: beside ? NOW_POSTER_ART_WIDTH + NOW_TEXT_WIDTH : NOW_BANNER_CARD_WIDTH },
        maxWidth: "100%",
        // A floor and not a fixed height, so a title that runs to another line grows the row rather
        // than being clipped by it; the cards stretch together, so they still share one height.
        minHeight: { md: NOW_HEIGHT },
        display: "flex",
      }}
    >
      <props.MediaComponent
        item={props.item}
        extractColour
        shape={shape}
        // The caller has sized the artwork itself, so the column is the picture's width rather than
        // a share of a card whose width was imposed on it.
        mediaLayout={beside ? "aside" : undefined}
        chip={{ label: mediumToLabel(props.medium), colour: mediumToColour(props.medium), onClick: props.onJump }}
        cardSx={{
          flexDirection: { xs: "column", md: "row" },
          width: "100%",
          // The banner card gives up the padding under its last line so the picture above can have
          // it, and its words then take the height the picture left rather than ending where the
          // text happens to end. Both are what put the last tile on the card's lower edge, level
          // with the poster beside it — a picture has no padding and no slack, so the poster card
          // ends exactly there and the banner card has to be made to.
          //
          // The card has to be told it is a column for the second half: a stacked card is a block,
          // and a child of a block cannot grow into the height its fixed-height parent has left
          // over. Only this card — a poster card's lower edge is already its picture.
          ...(beside
            ? {}
            : {
                display: "flex",
                flexDirection: "column",
                "& > .MuiCardContent-root:last-child": { paddingBottom: 0 },
                "& > .MuiCardContent-root": { flexGrow: 1 },
              }),
        }}
        sx={{
          // Sized from the shape every artwork of this kind is drawn at, never from the file's own
          // pixels, so the two poster cards are identical and an off-size file cannot make one of
          // them wider than the other. `contain` is what keeps such a file uncropped until it is
          // redrawn; artwork that matches the ratio fills the box exactly and nothing is letterboxed.
          aspectRatio: shapeToRatio(shape),
          objectFit: "contain",
          display: "block",
          ...(beside
            ? // Its column exactly, and the whole height of the row beside the words.
              { width: { xs: "100%", md: NOW_POSTER_ART_WIDTH }, height: { xs: "auto", md: "100%" } }
            : // Spans the card it was given; the ratio above then decides its height.
              { width: "100%", height: "auto" }),
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
    </Box>
  );
};

export default Stats;
