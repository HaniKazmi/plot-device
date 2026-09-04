import { Hub, Layers } from "@mui/icons-material";
import { Box, Stack, Typography } from "@mui/material";
import { usePhone } from "../common/breakpoints";
import {
  CardPanel,
  INLINE_SWATCH_SIZE,
  Swatch,
  type PanelStat,
  type PanelSubtitlePart,
  type TypedCardMediaImage,
} from "../common/Card";
import { useArtworkPalette } from "../common/artworkPalette";
import { LABEL_SX } from "../common/typography";
import { format } from "../utils/mathUtils";
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
import { cinemaLabel } from "../movie/types";
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
  NOW_ROW_HEIGHT,
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
 * The phone's rows are the exception, and for the same reason read the other way: a row has no
 * title, so its kicker carries what the title carried — the verb, the season and episode in hand,
 * the venue a film was seen at — since the artwork can name the work and cannot name any of those.
 *
 * Each card is the domain's own: its artwork and the figures its own hero carries, so a game reads
 * in hours and days and a season in episodes and pace, painted on the ground its home tab's app
 * bar is painted. A medium with nothing in flight simply contributes no card, rather than a card
 * saying nothing.
 */
const Now = ({ now }: { now: ReturnType<typeof electNow> }) => {
  const scheme = useScheme();
  /**
   * Whether the band is drawn as rows rather than as cards.
   *
   * A media query rather than the `sx` keys the rest of this file states its widths in, because
   * the two are different trees and not one tree at two sizes: drawn both ways with one hidden,
   * every picture is fetched twice and every artwork sampled twice, for a card the reader is
   * never shown.
   */
  const row = usePhone();

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

  return (
    // Measured on a wrapper the cap below does not narrow: the row itself is held to two cards'
    // width exactly when four do not fit, which is the answer being measured for.
    <Box ref={rowRef}>
      <Box
        sx={{
          display: "flex",
          // Rows on a phone, where each medium is a line of a list rather than a card; a wrapping
          // row of two from `sm`, where the page is wide enough for two cards and not for four.
          flexDirection: { xs: "column", sm: "row" },
          // A row of one height with the widths following, which is how every strip on this page
          // holds mixed artwork: an equal-thirds grid gives each card a width it did not ask for, and
          // the two shapes then reach that width at different heights. Sharing the height and letting
          // the widths differ is the same trade the other way round, and it is the one that leaves
          // every picture whole — a poster card comes out near-square and a banner card wider.
          flexWrap: { sm: "wrap" },
          alignItems: "stretch",
          gap: 1,
          // Four cards that do not fit one row are two rows of two, never three and one: the row
          // is held to the width two cards fill, so the third wraps.
          maxWidth: { md: dense && !oneRow ? 2 * NOW_CARD_WIDTH + NOW_GAP : undefined },
        }}
      >
        {now.game && (
          <NowItem
            item={now.game}
            medium="game"
            row={row}
            geometry={geometry}
            pair={pair}
            MediaComponent={VgCardMediaImage}
            tab={VideoGamesTab}
            kicker={`Since ${formatDate(now.game.startDate)}`}
            rowKicker={`Playing · since ${formatDate(now.game.startDate)}`}
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
          <NowItem
            item={now.show}
            medium="show"
            row={row}
            geometry={geometry}
            pair={pair}
            MediaComponent={ShowCardMediaImage}
            tab={ShowsTab}
            kicker={formatDate(now.show.show.lastWatchedDate!)}
            // The episode in hand, which the row has no title to carry: the poster names the show
            // and cannot say which season, let alone how far into it.
            rowKicker={`Watching · S${now.show.s}E${now.show.e} · ${formatDate(now.show.show.lastWatchedDate!)}`}
            title={`${now.show.show.name} S${now.show.s}`}
            subtitle={showSubtitle(now.show.show, scheme)}
            // The rate tile stays on the Shows tab's own hero; beside a poster this card's text
            // column holds two figures comfortably and three crowd it.
            stats={showHeroStats(now.show, 1, CURRENT_PLAINDATE, { pace: false })}
          />
        )}
        {now.movie && (
          <NowItem
            item={now.movie}
            medium="movie"
            row={row}
            geometry={geometry}
            pair={pair}
            MediaComponent={MovieCardMediaImage}
            tab={MoviesTab}
            kicker={formatDate(now.movie.startDate)}
            rowKicker={`Latest watch · ${formatDate(now.movie.startDate)} · ${cinemaLabel(now.movie)}`}
            title={now.movie.name}
            subtitle={movieSubtitle(now.movie, scheme)}
            stats={movieHeroStats(now.movie, 1)}
          />
        )}
        {now.book && (
          <NowItem
            item={now.book}
            medium="book"
            row={row}
            geometry={geometry}
            pair={pair}
            MediaComponent={BookCardMediaImage}
            tab={BooksTab}
            kicker={`Since ${formatDate(now.book.startDate)}`}
            rowKicker={`Reading · since ${formatDate(now.book.startDate)}`}
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
 * One medium's current item, as a card or as a row.
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
  kicker: string;
  /** The kicker a row carries, which says what a row has no title to say. */
  rowKicker: string;
  title: string;
  subtitle: PanelSubtitlePart[];
  stats: PanelStat[];
  /** Whether the band is drawn as rows, which is the phone's arrangement. */
  row: boolean;
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

  if (props.row) {
    return (
      // The name the row does not write. `role` because a bare box carries no label to a screen
      // reader without one; the picture inside states the same name as its alt text.
      <Box
        role="group"
        aria-label={props.title}
      >
        <props.MediaComponent
          item={props.item}
          extractColour
          chromeColour={ground}
          landscape
          mediaLayout="aside"
          cardSx={{
            flexDirection: "row",
            // Stated, so a row whose words run long clips them rather than growing past the four
            // rows the band is here to fit on one screen.
            height: NOW_ROW_HEIGHT,
            // The artwork column is its picture's width. The shared aside column hands it the
            // whole card below `md`, which is the hero's arrangement and not a row's.
            "& > .MuiCardActionArea-root": { width: "auto" },
          }}
          sx={{
            height: NOW_ROW_HEIGHT,
            width: "auto",
            // One height and each shape's own width from it — 142, 54 and 53 — reserved before the
            // file lands so the words beside it do not start in the picture's place. A poster and
            // a banner are authored to their ratios exactly, so holding them to it crops nothing;
            // a cover holds its own, no two of them sharing a ratio to be held to.
            aspectRatio: shapeIsExact(shape) ? shapeToRatio(shape) : shapeToAspect(shape),
            objectFit: "contain",
            display: "block",
          }}
          footerComponent={
            <NowRowPanel
              kicker={props.rowKicker}
              subtitle={props.subtitle}
              stats={props.stats}
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
 * The words of a Now row: what is happening, to what, and how far in.
 *
 * A panel of its own rather than `CardPanel` at another size, because the row's shape is the one
 * thing the panel does not hold — there is no title. The artwork carries the name, and dropping it
 * is what leaves the 80px row a line for the verb and the date, two for the maker and the genre,
 * and the figures standing clear of all four at the end.
 *
 * Those figures stack rather than sit side by side, so two cost the row no more width than one and
 * the words keep everything the picture did not take. The whole panel clips: it is inside a card
 * whose height the band stated, and a row that grew to hold a long author is a row that no longer
 * shares the band's line.
 */
const NowRowPanel = ({
  kicker,
  subtitle,
  stats,
}: {
  kicker: string;
  subtitle: PanelSubtitlePart[];
  stats: PanelStat[];
}) => {
  const palette = useArtworkPalette();
  // A caller lists its fields without testing which the sheet filled in.
  const said = subtitle.filter((part) => part.text);

  return (
    <Box
      sx={{
        display: "flex",
        flex: "1 1 0",
        minWidth: 0,
        alignItems: "center",
        gap: 1,
        paddingX: 1,
        overflow: "hidden",
        backgroundColor: palette.ground,
        color: palette.onGround,
        // Where the artwork meets the words, as every other card in the app draws that edge.
        borderLeft: palette.seam,
      }}
    >
      <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
        {/* Set as a sentence and not as a label, which is what the same line is on a card. It has
            to carry the verb, the episode in hand and the venue where the card carries a title,
            and at the label treatment's tracking and caps "Latest watch · 27 Aug 2026 · Home"
            takes three of the row's five lines. */}
        <Typography
          variant="caption"
          sx={{ display: "block", color: palette.muted, lineHeight: 1.35 }}
        >
          {kicker}
        </Typography>
        {/* One line each at one size and one weight: the maker and the genre are two facts of the
            same rank, and a row that set one above the other would be claiming an order the band
            does not have. */}
        {said.map((part, index) => (
          <Box
            // The position, not the text: the parts are a fixed sequence and two of them can hold
            // the same word.
            key={index}
            sx={{ display: "flex", alignItems: "center", columnGap: 0.5, minWidth: 0 }}
          >
            {part.swatch && (
              <Swatch
                colour={part.swatch}
                size={INLINE_SWATCH_SIZE}
              />
            )}
            <Typography
              variant="caption"
              sx={{ fontWeight: 500, lineHeight: 1.35, minWidth: 0, overflowWrap: "anywhere" }}
            >
              {part.text}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        {stats.map((stat) => (
          <Box
            key={stat.label}
            sx={{ textAlign: "right" }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, lineHeight: 1.3, fontVariantNumeric: "tabular-nums" }}
            >
              {typeof stat.value === "number" ? format(stat.value) : stat.value}
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: "block", color: palette.muted, lineHeight: 1.3, ...LABEL_SX }}
            >
              {stat.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default Stats;
