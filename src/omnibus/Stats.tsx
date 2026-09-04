import { Hub, Layers } from "@mui/icons-material";
import { Box, Stack, Typography } from "@mui/material";
import type { MouseEventHandler } from "react";
import { usePhone } from "../common/breakpoints";
import { CardPanel, type PanelStat, type PanelSubtitlePart, type TypedCardMediaImage } from "../common/Card";
import { useArtworkPalette } from "../common/artworkPalette";
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
import { barColour, BooksTab, MoviesTab, ShowsTab, VideoGamesTab, type Tab } from "../tabs";
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
  NOW_PANEL_INSET,
  NOW_SPINE_WIDTH,
  pairNowGeometry,
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
              // The third card of three, where the band pairs its cards: half a row leaves it
              // beside a gap, which reads as a card that lost its neighbour. Full width it is the
              // band's own closing line, above the media band that follows it.
              span={{ xs: 12, sm: 12 }}
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
 * A card's kicker here says only when, where the home tabs' heroes name the fact as well. The
 * card's ground already says which medium it is, and the card says the rest — so "last watched"
 * over a show and "latest watch" over a film label the one thing a date on a medium's own colour
 * cannot be mistaken for. The home heroes keep theirs: nothing beside them says it.
 *
 * On a phone the band is four pictures and four dates and nothing else: the artwork names the
 * work, the ground names the medium, and the date is the one fact of the four a picture cannot
 * carry. What a card says beyond that — the platform, the genre, the figures — is one tap away on
 * the expanded card, where a phone's column has no room for it beside a picture worth looking at.
 *
 * Each card is the domain's own: its artwork and the figures its own hero carries, so a game reads
 * in hours and days and a season in episodes and pace, painted on the ground its home tab's app
 * bar is painted. A medium with nothing in flight simply contributes no card, rather than a card
 * saying nothing.
 */
const Now = ({ now }: { now: ReturnType<typeof electNow> }) => {
  const scheme = useScheme();
  /**
   * Whether the band is the phone's grid of pictures rather than a row of cards.
   *
   * A media query rather than the `sx` keys the rest of this file states its widths in, because
   * the two are different trees and not one tree at two sizes: drawn both ways with one hidden,
   * every picture is fetched twice and every artwork sampled twice, for a card the reader is
   * never shown. It also decides the DOM order, which no `sx` can: the grid pairs by shape.
   */
  const phone = usePhone();

  // Every medium in flight at once is the one case the row cannot hold at its usual size.
  const dense = media.every((medium) => now[medium] !== undefined);
  // Whether four fit on one row is a question of the width the page gives the band and not of
  // any card, so the band measures it and solves the four-way share from it; where the share
  // falls under its floor the cards keep their usual size, two and two.
  const [rowRef, rowWidth] = useElementWidth<HTMLDivElement>();
  const geometry = (dense && rowWidth !== undefined && denseNowGeometry(rowWidth)) || NOW_GEOMETRY;
  const oneRow = geometry !== NOW_GEOMETRY;
  // The band two to a row, which is the arrangement between a phone and the desktop: the stated
  // card is wider than half a tablet's page, so this width is solved from the row as the four-way
  // share is. Only one of the two ever applies, the other being written under a breakpoint the
  // reader is not at. Under the share's own floor the stated card stands in, as it does for the
  // four-way share: two of those do not fit the row either, so the cards wrap to one apiece and
  // the band is a column of full-size cards rather than a row of two whose words cannot be read.
  const pair = rowWidth === undefined ? undefined : (pairNowGeometry(rowWidth) ?? NOW_GEOMETRY);

  // A lone banner takes the phone's whole row, rather than half of it beside a gap.
  const banners = (now.game ? 1 : 0) + (now.movie ? 1 : 0);
  const game = now.game && (
    <NowItem
      item={now.game}
      medium="game"
      phone={phone}
      alone={phone && banners === 1}
      geometry={geometry}
      pair={pair}
      MediaComponent={VgCardMediaImage}
      tab={VideoGamesTab}
      kicker={`Since ${formatDate(now.game.startDate)}`}
      title={now.game.name}
      // The genre alone, like the two cards beside it: this page draws no gameplay
      // vocabulary, so a game's Now card names the one thing all three media record.
      subtitle={[{ text: now.game.platform }, { text: now.game.genre, swatch: genreToColour(now.game.genre, scheme) }]}
      // The franchise tile is dropped by passing the game alone. The Franchises section is
      // where this page states what a franchise holds, and it is drawn from the filtered
      // union — while the hero is elected from the library and the filters do not narrow it,
      // so a tile here would quote a number that moves under a control the card ignores.
      stats={heroStats(now.game, [now.game], CURRENT_PLAINDATE)}
    />
  );
  const show = now.show && (
    <NowItem
      item={now.show}
      medium="show"
      phone={phone}
      geometry={geometry}
      pair={pair}
      MediaComponent={ShowCardMediaImage}
      tab={ShowsTab}
      kicker={formatDate(now.show.show.lastWatchedDate!)}
      // The episode in hand, which the row has no title to carry: the poster names the show
      // and cannot say which season, let alone how far into it.
      title={`${now.show.show.name} S${now.show.s}`}
      subtitle={showSubtitle(now.show.show, scheme)}
      // The rate tile stays on the Shows tab's own hero; beside a poster this card's text
      // column holds two figures comfortably and three crowd it.
      stats={showHeroStats(now.show, 1, CURRENT_PLAINDATE, { pace: false })}
    />
  );
  const movie = now.movie && (
    <NowItem
      item={now.movie}
      medium="movie"
      phone={phone}
      alone={phone && banners === 1}
      geometry={geometry}
      pair={pair}
      MediaComponent={MovieCardMediaImage}
      tab={MoviesTab}
      kicker={formatDate(now.movie.startDate)}
      title={now.movie.name}
      subtitle={movieSubtitle(now.movie, scheme)}
      stats={movieHeroStats(now.movie, 1)}
    />
  );
  const book = now.book && (
    <NowItem
      item={now.book}
      medium="book"
      phone={phone}
      geometry={geometry}
      pair={pair}
      MediaComponent={BookCardMediaImage}
      tab={BooksTab}
      kicker={`Since ${formatDate(now.book.startDate)}`}
      title={now.book.name}
      subtitle={bookSubtitle(now.book, scheme)}
      // Two tiles, as the show card beside it carries: the column beside a cover holds two and
      // wraps a third under them, and the rest stay on the Books tab's own hero.
      stats={bookHeroStats(now.book, CURRENT_PLAINDATE, "card")}
    />
  );

  return (
    // Measured on a wrapper the cap below does not narrow: the row itself is held to two cards'
    // width exactly when four do not fit, which is the answer being measured for.
    <Box ref={rowRef}>
      <Box
        sx={{
          // Two cells to a row on a phone, the banners on the first row and the portraits on the
          // second, so a row shares a shape and a height; a wrapping row of two from `sm`, where
          // the page is wide enough for two cards and not for four.
          display: { xs: "grid", sm: "flex" },
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          alignItems: { xs: "start", sm: "stretch" },
          flexDirection: { xs: "column", sm: "row" },
          // A row of one height with the widths following, which is how every strip on this page
          // holds mixed artwork: an equal-thirds grid gives each card a width it did not ask for, and
          // the two shapes then reach that width at different heights. Sharing the height and letting
          // the widths differ is the same trade the other way round, and it is the one that leaves
          // every picture whole — a poster card comes out near-square and a banner card wider.
          flexWrap: { sm: "wrap" },
          gap: 1,
          // Four cards that do not fit one row are two rows of two, never three and one: the row
          // is held to the width two cards fill, so the third wraps.
          maxWidth: { md: dense && !oneRow ? 2 * NOW_CARD_WIDTH + NOW_GAP : undefined },
        }}
      >
        {game}
        {/* The phone pairs the two banners on the first row and the poster and the cover on the
            second, so each row shares a shape and a height; elsewhere the four stand in the
            tabs' own order. */}
        {phone ? movie : show}
        {phone ? show : movie}
        {book}
      </Box>
    </Box>
  );
};

/**
 * One medium's current item, as a card or as one cell of the phone's grid.
 *
 * A Now card is painted the colour its home tab's app bar wears in the same scheme (`barColour`,
 * `tabs.ts`). Four cards from four tabs on one page are told apart by what the tabs are already
 * told apart by, so a card here matches the bar the reader arrives under on that tab and needs
 * no chip to name its medium. A card painted from its own artwork instead is tied to its picture,
 * which is what every other card in the app does and what this one gives up: here the four are
 * read against each other, and four sampled colours say nothing about which is which.
 *
 * Both arrangements are the domain's own `TypedCardMediaImage`, exactly as the hero is: the
 * election, the artwork, the ground and the expanded card a tap opens are one implementation, and
 * only where the words sit differs.
 */
const NowItem = <T,>(props: {
  item: T;
  medium: Medium;
  MediaComponent: TypedCardMediaImage<T>;
  /** The home tab, whose app bar's colour the card is painted in. */
  tab: Tab;
  /** When: the one line the phone's cell keeps, and the first line of the card's panel. */
  kicker: string;
  title: string;
  subtitle: PanelSubtitlePart[];
  stats: PanelStat[];
  /** Whether the band is the phone's grid, where a cell is a picture and a date. */
  phone: boolean;
  /**
   * Whether a banner is the only one in flight on the phone, where it takes the grid's whole
   * row: a banner at half the row is 98px tall, and the half beside it would hold nothing.
   */
  alone?: boolean;
  /** The band's one size, from `md` up. */
  geometry: NowGeometry;
  /** The same, shared two to a row, until the row has been measured. */
  pair: NowGeometry | undefined;
}) => {
  const scheme = useScheme();

  const shape = mediumToShape(props.medium);
  const beside = shapeToArrangement(shape) === "beside";
  const geometry = props.geometry;
  const pair = props.pair;
  const ground = barColour(props.tab, scheme);

  if (props.phone) {
    return (
      // The name the cell does not write. `role` because a bare box carries no label to a screen
      // reader without one; the picture inside states the same name as its alt text. The whole
      // cell opens the card, so a finger on the date does what a finger on the picture does.
      <Box
        role="group"
        aria-label={props.title}
        onClick={openFromCell}
        sx={{ minWidth: 0, gridColumn: props.alone ? "1 / -1" : undefined }}
      >
        <props.MediaComponent
          item={props.item}
          extractColour
          chromeColour={ground}
          // The cell has sized its own picture, so the card is one flex container running the
          // way the shape says, and the artwork's own width: the shared aside column hands the
          // whole card to the picture below `md` for the hero, which has no spine beside it.
          landscape
          mediaLayout={beside ? "aside" : undefined}
          cardSx={{
            flexDirection: beside ? "row" : "column",
            width: "100%",
            // The picture takes what the spine leaves: its column gives way and the spine
            // does not, so a cover a few percent off 2:3 changes the cell's height and never
            // the spine's width.
            ...(beside && { "& > .MuiCardActionArea-root": { flex: "1 1 auto", minWidth: 0, width: "auto" } }),
          }}
          sx={{
            // Every picture is as wide as its column and as tall as its shape makes it at that
            // width — a banner across the cell at 16:9, a poster beside the spine — so a wider
            // phone gets a taller picture rather than ground around one. A poster and a banner
            // are authored to their ratios exactly, so holding them to it crops nothing; a cover
            // holds its own, no two of them sharing a ratio to be held to.
            width: "100%",
            height: "auto",
            aspectRatio: shapeIsExact(shape) ? shapeToRatio(shape) : shapeToAspect(shape),
            objectFit: "contain",
            display: "block",
          }}
          footerComponent={
            <NowDate
              date={props.kicker}
              spine={beside}
            />
          }
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: "0 0 auto",
        // One width for every card in the band, which each shape then spends its own way. Two to a
        // row until there is width for the stated card, where the share is solved from the row and
        // stands in as half of it for the frame before the row has been measured.
        width: { sm: pair?.cardWidth ?? `calc(50% - ${NOW_GAP / 2}px)`, md: geometry.cardWidth },
        maxWidth: "100%",
        // A floor and not a fixed height, so a title that runs to another line grows the row rather
        // than being clipped by it; the cards stretch together, so they still share one height.
        minHeight: { sm: pair?.height, md: geometry.height },
        display: "flex",
      }}
    >
      <props.MediaComponent
        item={props.item}
        // Sampled as well as painted: the card wears the bar's colour, and the expanded card it
        // opens wears the artwork's own, as it does from every other surface.
        extractColour
        chromeColour={ground}
        shape={shape}
        // The caller has sized the artwork itself, so the column is the picture's width rather than
        // a share of a card whose width was imposed on it.
        mediaLayout={beside ? "aside" : undefined}
        cardSx={{
          // A poster card is a row at every width; only a banner card stacks, and it stacks always.
          flexDirection: beside ? "row" : "column",
          width: "100%",
          // The artwork column is its picture's width. `ASIDE_ACTION_AREA_SX` hands it the whole
          // card below `md` for the hero, which fills the page's width and has no second card
          // beside it to take the room from.
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
                // file's own pixels, so two cards of one shape are identical and an off-size file
                // cannot make one of them wider than the other. `contain` is what keeps such a
                // file uncropped until it is redrawn; artwork that matches the ratio fills the box
                // exactly and nothing is letterboxed.
                aspectRatio: shapeToRatio(shape),
                objectFit: "contain",
                display: "block",
                ...(beside
                  ? // Its column exactly, the width the row's height gives a poster at its ratio.
                    // Width rather than height, because the column beside it does not stretch:
                    // a percentage height against it resolves to nothing.
                    {
                      width: { sm: pair?.posterArtWidth, md: geometry.posterArtWidth },
                      height: "100%",
                    }
                  : // The card's own width at 16:9, so the banner fills it edge to edge with
                    // nothing letterboxed and nothing cropped — the height follows the width
                    // rather than being whatever the words left over.
                    {
                      width: "100%",
                      height: { sm: pair?.bannerArtHeight, md: geometry.bannerArtHeight },
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
                height: { sm: pair?.height, md: geometry.height },
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

/**
 * Forwards a tap anywhere in a phone cell to its picture, which is what opens the card.
 *
 * At module scope, so the cell's handler is one function rather than one per render. A click
 * that came from the picture is left alone, since it is the one being forwarded to; so is one
 * from the expanded dialog, which portals out of the cell's DOM but bubbles to it through React —
 * forwarded, its close button would reopen the card it had just closed.
 */
const openFromCell: MouseEventHandler<HTMLElement> = (event) => {
  const target = event.target;
  if (!(target instanceof Element) || !event.currentTarget.contains(target)) return;
  if (target.closest(".MuiCardActionArea-root")) return;
  event.currentTarget.querySelector<HTMLElement>(".MuiCardActionArea-root > :first-child")?.click();
};

/**
 * The date of a phone cell: a line under a banner, a spine beside a poster.
 *
 * The spine sets its date down the column as a book's spine does, because the column is 36px
 * (`NOW_SPINE_WIDTH`) and a date across it is four lines of two characters. It is a column at all,
 * rather than a line beneath the poster, because a line beneath costs the picture its height on a
 * cell whose width already fixes it, where the banner's line beneath costs a banner nothing it had.
 */
const NowDate = ({ date, spine }: { date: string; spine: boolean }) => {
  const palette = useArtworkPalette();

  return (
    <Box
      sx={{
        flex: spine ? "1 1 auto" : "0 0 auto",
        minWidth: spine ? NOW_SPINE_WIDTH : 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 1,
        backgroundColor: palette.ground,
        color: palette.onGround,
        // Where the artwork meets the words, as every other card in the app draws that edge.
        ...(spine ? { borderLeft: palette.seam } : { borderTop: palette.seam }),
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 600,
          lineHeight: 1,
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
          ...(spine && { writingMode: "vertical-rl" }),
        }}
      >
        {date}
      </Typography>
    </Box>
  );
};

export default Stats;
