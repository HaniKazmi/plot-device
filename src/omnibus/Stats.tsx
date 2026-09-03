import { Hub, Layers } from "@mui/icons-material";
import { Box, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { CardPanel, type PanelStat, type PanelSubtitlePart, type TypedCardMediaImage } from "../common/Card";
import { CURRENT_PLAINDATE, formatDate, type YearNumber } from "../common/date";
import type { YearType } from "../common/filterReducer";
import { Section, StatBand } from "../common/SectionRail";
import { StatCard, TotalsBand, VitalsCard, YearVitalsPair } from "../common/Stats";
import { genreToColour } from "../utils/types";
import BookCardMediaImage from "../books/CardMediaImage";
import { bookSubtitle } from "../books/cardData";
import { bookHeroStats } from "../books/statsData";
import MovieCardMediaImage from "../movie/CardMediaImage";
import { movieSubtitle } from "../movie/cardData";
import { movieHeroStats } from "../movie/statsData";
import ShowCardMediaImage from "../show/CardMediaImage";
import { showSubtitle } from "../show/cardData";
import { showHeroStats } from "../show/statsData";
import VgCardMediaImage from "../vg/CardMediaImage";
import { heroStats } from "../vg/statsData";
import { BooksTab, MoviesTab, ShowsTab, VideoGamesTab, type Tab } from "../tabs";
import { electNow, hasNow, measureOf, unionTotals, type OmniItem } from "./adapter";
import { crossingEntries, type Crossing } from "./crossingsData";
import type { FilterDispatch } from "./filterUtils";
import { OMNIBUS_SECTIONS } from "./sections";
import { media, mediumToColour, mediumToLabel, mediumToShape, type Measure, type Medium } from "./types";
import { shapeIsExact, shapeToArrangement, shapeToAspect, shapeToRatio } from "../common/cardArrangement";
import { useScheme } from "../common/useScheme";
import { useElementWidth } from "../common/useElementWidth";
import {
  denseNowGeometry,
  NOW_BANNER_TEXT_HEIGHT,
  NOW_CARD_WIDTH,
  NOW_GAP,
  NOW_GEOMETRY,
  NOW_HEIGHT_XS,
  NOW_PANEL_INSET,
  NOW_POSTER_ART_WIDTH_XS,
  type NowGeometry,
} from "./nowGeometry";

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
  earliestYear: YearNumber;
  measure: Measure;
  yearType: YearType;
  yearTo: YearNumber;
  filterDispatch: FilterDispatch;
}) => {
  const scheme = useScheme();

  const totals = unionTotals(data);
  const inYear = unionTotals(data.filter((item) => item.year === yearTo));
  // Whether more than one medium survived the filters, which is what the composition band below
  // has to have something to say about: a proportional bar over one group is a full bar stating
  // what the reader just chose. Asked of the first item rather than of a set of all of them —
  // there are three possible answers and 1,464 rows, and this is on the undeferred path.
  const mixesMedia = data.some((item) => item.medium !== data[0]?.medium);

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
          <YearVitalsPair
            yearTo={yearTo}
            yearType={yearType}
            filterDispatch={filterDispatch}
            earliestYear={earliestYear}
            allTime={totals}
            // The years figure is dropped: inside one year it can only ever read 1.
            inYear={{ hours: inYear.hours, items: inYear.items }}
          />
          {/* A figure no one tab can state: a series held by two media is one franchise here and
              one on each of their tabs, so the union's count is not the three counts added up.

              It stands with the year cards rather than after the Media band because the band is
              full-width and opens a row of its own: a card placed after it would be the only
              thing on that row and read as one that lost its neighbours. */}
          {crossings.length > 0 && (
            <StatCard
              icon={<Hub />}
              title="Franchises"
              content={[
                ["Franchises", crossings.length],
                ["Entries", crossingEntries(crossings)],
              ]}
            />
          )}
          {mixesMedia && (
            <VitalsCard>
              <TotalsBand
                title="Media"
                icon={<Layers />}
                data={data}
                measureFunc={(items) => measureOf(items, measure)}
                group={[...media]}
                groupOf={(item) => item.medium}
                groupToColour={(ele) => mediumToColour(ele, scheme)}
                groupToLabel={mediumToLabel}
                measureLabel={measure}
              />
            </VitalsCard>
          )}
        </StatBand>
      </Section>
      {/* This file holds the bands above the charts and nothing else. The browse surfaces — the
          gallery and recently finished — belong to `Graphs`, at the `OMNIBUS_SECTIONS.gallery`
          and `.finished` anchors. */}
    </Stack>
  );
};

/**
 * What each medium is on right now, side by side — the one view none of the four tabs can show,
 * and the reason the page opens with it rather than with a total.
 *
 * A card's kicker here says only when, where the home tabs' heroes name the fact as well. The chip
 * in the corner already says which medium the card is, and the card says the rest — so "last
 * watched" over a show and "latest watch" over a film were labelling the one thing a date beside a
 * medium cannot be mistaken for. The home heroes keep theirs: nothing beside them says it.
 *
 * Each card is the domain's own: its artwork, its badge, and the figures its own hero carries, so
 * a game reads in hours and days and a season in episodes and pace. A medium with nothing in
 * flight simply contributes no card, rather than a card saying nothing.
 */
const Now = ({ now }: { now: ReturnType<typeof electNow> }) => {
  const scheme = useScheme();

  const navigate = useNavigate();

  // The jump the medium chip makes. Built from the tab objects rather than from written-out paths,
  // since the id *is* the route and only the registry should know that.
  const jump = (tab: Tab) => () => {
    navigate(`/${tab.id}`);
    window.scrollTo({ top: 0 });
  };

  // Every medium in flight at once is the one case the row cannot hold at its usual size.
  const dense = media.every((medium) => now[medium] !== undefined);
  // Whether four fit on one row is a question of the width the page gives the band and not of
  // any card, so the band measures it and solves the four-way share from it; where the share
  // falls under its floor the cards keep their usual size, two and two.
  const [rowRef, rowWidth] = useElementWidth<HTMLDivElement>();
  const geometry = (dense && rowWidth !== undefined && denseNowGeometry(rowWidth)) || NOW_GEOMETRY;
  const oneRow = geometry !== NOW_GEOMETRY;

  return (
    // Measured on a wrapper the cap below does not narrow: the row itself is held to two cards'
    // width exactly when four do not fit, which is the answer being measured for.
    <Box ref={rowRef}>
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
          // Four cards that do not fit one row are two rows of two, never three and one: the row
          // is held to the width two cards fill, so the third wraps.
          maxWidth: { md: dense && !oneRow ? 2 * NOW_CARD_WIDTH + NOW_GAP : undefined },
        }}
      >
        {now.game && (
          <NowCard
            item={now.game}
            medium="game"
            geometry={geometry}
            MediaComponent={VgCardMediaImage}
            onJump={jump(VideoGamesTab)}
            kicker={`Since ${formatDate(now.game.startDate)}`}
            title={now.game.name}
            // The genre alone, like the two cards beside it: this page draws no gameplay
            // vocabulary, so a game's Now card names the one thing all three media record.
            subtitle={[
              { text: now.game.platform },
              { text: now.game.genre, swatch: genreToColour(now.game.genre, scheme) },
            ]}
            // The franchise tile is dropped by passing the game alone. The Franchises section is
            // where this page states what a franchise holds, and it is drawn from the filtered
            // union — while the hero is elected from the library and the filters do not narrow it,
            // so a tile here would quote a number that moves under a control the card ignores.
            stats={heroStats(now.game, [now.game], CURRENT_PLAINDATE)}
          />
        )}
        {now.show && (
          <NowCard
            item={now.show}
            medium="show"
            geometry={geometry}
            MediaComponent={ShowCardMediaImage}
            onJump={jump(ShowsTab)}
            kicker={formatDate(now.show.show.lastWatchedDate!)}
            title={`${now.show.show.name} S${now.show.s}`}
            subtitle={showSubtitle(now.show.show, scheme)}
            // The rate tile stays on the Shows tab's own hero; beside a poster this card's text
            // column holds two figures comfortably and three crowd it.
            stats={showHeroStats(now.show, 1, CURRENT_PLAINDATE, { pace: false })}
          />
        )}
        {now.movie && (
          <NowCard
            item={now.movie}
            medium="movie"
            geometry={geometry}
            MediaComponent={MovieCardMediaImage}
            onJump={jump(MoviesTab)}
            kicker={formatDate(now.movie.startDate)}
            title={now.movie.name}
            subtitle={movieSubtitle(now.movie, scheme)}
            stats={movieHeroStats(now.movie, 1)}
          />
        )}
        {now.book && (
          <NowCard
            item={now.book}
            medium="book"
            geometry={geometry}
            MediaComponent={BookCardMediaImage}
            onJump={jump(BooksTab)}
            kicker={`Since ${formatDate(now.book.startDate)}`}
            title={now.book.name}
            subtitle={bookSubtitle(now.book, scheme)}
            // Two tiles, as the show card beside it carries: the column beside a cover holds two and
            // wraps a third under them, and the rest stay on the Books tab's own hero.
            stats={bookHeroStats(now.book, CURRENT_PLAINDATE, "card")}
          />
        )}
      </Box>
    </Box>
  );
};

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
  /** The band's one size, from `md` up; below it a card is the screen's width. */
  geometry: NowGeometry;
}) => {
  const scheme = useScheme();

  const shape = mediumToShape(props.medium);
  const beside = shapeToArrangement(shape) === "beside";
  const geometry = props.geometry;

  return (
    <Box
      sx={{
        flex: "0 0 auto",
        // One width for every card in the band, which each shape then spends its own way.
        width: { xs: "100%", md: geometry.cardWidth },
        maxWidth: "100%",
        // A floor and not a fixed height, so a title that runs to another line grows the row rather
        // than being clipped by it; the cards stretch together, so they still share one height.
        minHeight: { xs: beside ? NOW_HEIGHT_XS : undefined, md: geometry.height },
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
        chip={{
          label: mediumToLabel(props.medium),
          colour: mediumToColour(props.medium, scheme),
          onClick: props.onJump,
        }}
        cardSx={{
          // A poster card is a row at every width; only a banner card stacks, and it stacks always.
          flexDirection: beside ? "row" : { xs: "column", md: "row" },
          width: "100%",
          // The artwork column is its picture's width on a phone too. `ASIDE_ACTION_AREA_SX` hands
          // it the whole card below `md` for the hero, which fills the page's width and has no
          // second card under it to be pushed down by.
          ...(beside && { "& > .MuiCardActionArea-root": { width: "auto" } }),
          // The banner card is a column whose picture is the part that gives: the words are the
          // height of their own lines plus the row's shared lower inset, and everything else in
          // the card belongs to the picture above. So the last tile lands one inset above the
          // card's lower edge — level with the tiles of the poster cards beside it, whose panels
          // keep that same inset — at whatever height the row settles on.
          //
          // Giving the words the leftover height instead leaves them spread apart in a card taller
          // than the picture wanted, and hangs the tile below the edge in one shorter; deriving the
          // card's height
          // from its own picture instead of taking the row's makes it a card of its own height in a
          // row of one. The card is only told to be a column here because a stacked card is a
          // block, and a block's children cannot divide up its height.
          ...(beside
            ? {}
            : {
                display: "flex",
                flexDirection: "column",
                // Both halves are stated, because the width fixes the picture's height and the row
                // fixes the card's: the picture is 16:9 at this width and the panel is the rest.
                // Neither gives way to the other, which is what keeps the picture uncropped.
                "& > .MuiCardActionArea-root": { flex: "0 0 auto" },
                "& > .MuiCardContent-root": { flex: "0 0 auto" },
              }),
        }}
        sx={
          shapeIsExact(shape)
            ? {
                // Sized from the shape every artwork of this kind is drawn at, never from the
                // file's own pixels, so the two poster cards are identical and an off-size file
                // cannot make one of them wider than the other. `contain` is what keeps such a
                // file uncropped until it is redrawn; artwork that matches the ratio fills the box
                // exactly and nothing is letterboxed.
                aspectRatio: shapeToRatio(shape),
                objectFit: "contain",
                display: "block",
                ...(beside
                  ? // Its column exactly, and the whole height of the row beside the words.
                    {
                      width: { xs: NOW_POSTER_ART_WIDTH_XS, md: geometry.posterArtWidth },
                      height: { xs: "100%", md: "100%" },
                    }
                  : // The card's own width at 16:9, so the banner fills it edge to edge with
                    // nothing letterboxed and nothing cropped — the height follows the width
                    // rather than being whatever the words left over.
                    {
                      width: "100%",
                      height: { xs: "auto", md: geometry.bannerArtHeight },
                    }),
              }
            : {
                // A cover's ratio is not one every cover holds, so it is pinned on the row's height
                // and takes whatever width its file has: a cover a few percent off 2:3 stands a few
                // pixels wider or narrower, uncropped and unletterboxed, and the text column beside
                // it gives up or gains those pixels. The reservation stands in only until the
                // picture has loaded, which keeps the card the right size to within that margin.
                aspectRatio: shapeToAspect(shape),
                display: "block",
                width: "auto",
                height: { xs: NOW_HEIGHT_XS, md: geometry.height },
              }
        }
        footerComponent={
          <CardPanel
            // Held to a height its content did not choose, on every card in the band.
            statSize="compact"
            // Only the banner card works to a budget — the height its picture leaves it. The inset
            // is every card's, since the row is read across the figures the panels end with.
            height={beside ? undefined : NOW_BANNER_TEXT_HEIGHT}
            inset={NOW_PANEL_INSET}
            // Only the banner card, whose panel is the card's full width: at 402px the date and the
            // platform share a line comfortably, and the line that saves is most of what the stated
            // height had spare. The poster panels are a 176px column, where the same two would wrap
            // to four lines and cost more than they saved.
            inlineKicker={!beside}
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
