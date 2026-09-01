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
import { movieHeroStats } from "../movie/statsData";
import ShowCardMediaImage from "../show/CardMediaImage";
import { showHeroStats } from "../show/statsData";
import VgCardMediaImage from "../vg/CardMediaImage";
import { heroStats } from "../vg/statsData";
import { MoviesTab, ShowsTab, VideoGamesTab, type Tab } from "../tabs";
import { electNow, hasNow, measureOf, unionTotals, type OmniItem } from "./adapter";
import { crossingEntries, type Crossing } from "./crossingsData";
import type { FilterDispatch } from "./filterUtils";
import { OMNIBUS_SECTIONS } from "./sections";
import { media, mediumToColour, mediumToLabel, mediumToShape, type Measure, type Medium } from "./types";
import { shapeRatioValues, shapeToArrangement, shapeToRatio } from "../common/cardArrangement";

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
          {/* The one figure on this page that could not be read off any of the three tabs: a
              franchise is only a crossing when more than one of them holds it.

              It stands with the year cards rather than after the Media band because it is a
              quarter-width card and the band takes the whole row: anything placed after the band
              opens a row of its own and reads as a card that lost its neighbours. */}
          {crossings.length > 0 && (
            <StatCard
              icon={<Hub />}
              title="Crossings"
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
                groupToColour={mediumToColour}
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
 * What each medium is on right now, side by side — the one view none of the three tabs can show,
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
          kicker={`Since ${formatDate(now.game.startDate)}`}
          title={now.game.name}
          // The shared ramp at full chroma, like the two cards beside it: this page draws no
          // gameplay vocabulary, so the collision the Games tab dims for does not arise here.
          subtitle={[{ text: now.game.platform }, { text: now.game.genre, swatch: genreToColour(now.game.genre) }]}
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
          kicker={formatDate(now.show.show.lastWatchedDate!)}
          title={`${now.show.show.name} S${now.show.s}`}
          subtitle={[
            { text: now.show.show.network },
            { text: now.show.show.genre, swatch: genreToColour(now.show.show.genre) },
          ]}
          // The rate tile stays on the Shows tab's own hero; beside a poster this card's text
          // column holds two figures comfortably and three crowd it.
          stats={showHeroStats(now.show, 1, CURRENT_PLAINDATE, { pace: false })}
        />
      )}
      {now.movie && (
        <NowCard
          item={now.movie}
          medium="movie"
          MediaComponent={MovieCardMediaImage}
          onJump={jump(MoviesTab)}
          kicker={formatDate(now.movie.startDate)}
          title={now.movie.name}
          subtitle={[{ text: now.movie.director }, { text: now.movie.genre, swatch: genreToColour(now.movie.genre) }]}
          stats={movieHeroStats(now.movie, 1)}
        />
      )}
    </Box>
  );
};

/** The row's one height, and the column of words a poster card carries beside its picture. */
const NOW_HEIGHT = 380;
const NOW_TEXT_WIDTH = 176;

/**
 * The same band on a phone, where the three cards are a column rather than a row.
 *
 * A card that fills the width is a card as tall as its own artwork: at 375px a full-bleed poster
 * stands 550px, and three of them put the band's last figure nearly two screens below the first —
 * a page that opens on what is in flight instead opens on one picture. Seating the words beside the
 * artwork at a height the caller picks is what the arrangement rule is for (§6); it is applied by
 * shape at every other width and by shape *and* width here, because the constraint a phone adds is
 * the one the rule cannot see.
 *
 * A banner keeps its words underneath at every width. Beside a 16:9 picture at this height there
 * are nineteen pixels of column left, and the arrangement exists to give each shape the axis it has
 * room on.
 */
const NOW_HEIGHT_XS = 200;
const NOW_POSTER_ART_WIDTH_XS = Math.round(NOW_HEIGHT_XS * shapeRatioValues.portrait);

/**
 * The band's geometry: one width and one height for every card in the row.
 *
 * The widths are stated rather than left to the artwork's own pixels for two reasons. A flex row
 * asks an item how wide it wants to be before any height is known, and a picture asked that answers
 * with its file's width — a 680px poster then claims 680px and drags the row past 1,000 tall. And a
 * file that is off its declared ratio would stand the two poster cards at different sizes for a
 * reason no reader can see.
 *
 * One width is the constraint everything else here follows from, and the two shapes meet it in
 * opposite ways:
 *
 * - a poster card is a full-height poster — the height at the poster's own ratio — plus a text
 *   column, and that sum is the width;
 * - the banner card is the same width spent the other way round: its picture spans the card, so the
 *   width fixes the picture's height at 16:9 and the panel gets whatever the row's height leaves.
 *
 * That leaves the banner's panel a stated budget rather than a measured one, which is why its card
 * carries no subtitle and why its title cannot wrap: at this width the words have to fit 136px, and
 * a picture that gave way instead would be letterboxed inside a card the row had already sized.
 */
const NOW_POSTER_ART_WIDTH = Math.round(NOW_HEIGHT * shapeRatioValues.portrait);
const NOW_CARD_WIDTH = NOW_POSTER_ART_WIDTH + NOW_TEXT_WIDTH;
const NOW_BANNER_ART_HEIGHT = Math.round(NOW_CARD_WIDTH / shapeRatioValues.landscape);
const NOW_BANNER_TEXT_HEIGHT = NOW_HEIGHT - NOW_BANNER_ART_HEIGHT;

/**
 * What every panel in the band gives up so that 136 holds a kicker, a title, a subtitle and a
 * figure.
 *
 * The inset and the tile size are spent on all three cards rather than on the banner alone. The row
 * is read across its figures — the tiles share a baseline and a size — so a tile shrunk on one card
 * and not the other two would trade the band's own consistency for the banner's fit. At 8 above and
 * below, with a 48px compact tile, the banner's kicker, title, subtitle and figure come to the
 * budget exactly, and the poster cards carry the same tiles above the same edge.
 */
const NOW_PANEL_INSET = 1;

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
  const beside = shapeToArrangement(shape) === "beside";

  return (
    <Box
      sx={{
        flex: "0 0 auto",
        // One width for every card in the band, which each shape then spends its own way.
        width: { xs: "100%", md: NOW_CARD_WIDTH },
        maxWidth: "100%",
        // A floor and not a fixed height, so a title that runs to another line grows the row rather
        // than being clipped by it; the cards stretch together, so they still share one height.
        minHeight: { xs: beside ? NOW_HEIGHT_XS : undefined, md: NOW_HEIGHT },
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
              {
                width: { xs: NOW_POSTER_ART_WIDTH_XS, md: NOW_POSTER_ART_WIDTH },
                height: { xs: "100%", md: "100%" },
              }
            : // The card's own width at 16:9, so the banner fills it edge to edge with nothing
              // letterboxed and nothing cropped — the height follows the width rather than being
              // whatever the words left over.
              { width: "100%", height: { xs: "auto", md: NOW_BANNER_ART_HEIGHT } }),
        }}
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
