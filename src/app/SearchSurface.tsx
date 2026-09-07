import { Box, Button, Stack, Typography } from "@mui/material";
import { useDeferredValue, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swatch } from "../common/Card";
import { CURRENT_PLAINDATE } from "../common/date";
import { DrilldownDialog } from "../common/DrilldownDialog";
import { SchemaPageControls } from "../common/FilterControls";
import { all, narrowedTo, stated } from "../common/population";
import { keyLabel } from "../utils/stringUtils";
import {
  LEAD_HEIGHT,
  LEAD_WIDTH,
  SearchPalette,
  type PaletteGroup,
  type PaletteHit,
  type PaletteReading,
} from "../common/SearchPalette";
import { closeSearch, setSearchMode, setSearchScope, type SearchMode } from "../common/searchOpen";
import { fieldsOf, type CategoryContext } from "../common/filterSchema";
import { FRANCHISE_KEY } from "../common/filterSchema";
import { rankHits, type Hit, type Searchable } from "../common/searchData";
import { MUTED_FIGURE_SX } from "../common/typography";
import { format } from "../utils/mathUtils";
import { useScheme } from "../common/useScheme";
import { franchiseToColour, mediumToColour, type Colour, type Medium, type Scheme } from "../utils/types";
import type { OmniItem } from "../common/medium";
import { Dot, MediumDot } from "./MediaCounts";
import { MEDIA as MEDIA_MODULES, omniArtwork } from "./media";
import OmniCardMediaImage from "./CardMediaImage";
import { MIXED_CARD_SIZING, workLabels } from "./cardData";
import { FranchiseView } from "./FranchiseView";
import { useLibrary, type Library } from "./library";
import { mediumBand } from "./mediumBand";
import { usePage } from "./page";
import { PAGE_MODULES, PAGE_STORES, pageCount } from "./pageState";
import {
  attributeAction,
  attributeWorks,
  buildSearchIndex,
  OPEN_STRIP_LIMIT,
  recentValues,
  searchScope,
  searchUnion,
  unionEpoch,
  type AttributeEntry,
  type FranchiseSearchEntry,
  type ItemSearchEntry,
  type PlacedAttribute,
  type CategorySearchEntry,
  type SearchEntry,
  type SearchGroup,
} from "./searchData";
import { media, mediumToShape } from "./types";
import Tabs, { tabForId, tabInk, useOtherTabs } from "../tabs";

/** What a chosen hit opens: a whole franchise, one work's own expanded card, or an attribute's shelf. */
type Picked =
  | { kind: "franchise"; franchise: string }
  | { kind: "item"; item: OmniItem }
  | { kind: "shelf"; attribute: AttributeEntry };

/**
 * The thumbnail at a hit's left: a banner at the lead's full width, a poster or a cover standing
 * tall inside it, and a tile in the medium's fill where the sheet holds no picture.
 */
const Thumb = ({ item, scheme }: { item: OmniItem; scheme: Scheme }) => {
  const src = omniArtwork(item);
  const tall = mediumToShape(item.medium) !== "banner";
  const size = tall ? { width: 24, height: 36 } : { width: LEAD_WIDTH, height: LEAD_HEIGHT };
  if (!src) {
    return (
      <Box sx={{ ...size, borderRadius: 0.5, backgroundColor: mediumToColour(item.medium, scheme), opacity: 0.35 }} />
    );
  }
  return (
    <Box
      component="img"
      src={src}
      alt=""
      // The same request the card makes, so the two share one cache entry. TMDB's CDN sends the
      // CORS header only to a request carrying an Origin and caches the answer for a year without
      // varying on it, so a poster first loaded here without the header poisons the card's
      // sampling load of the same URL for as long as the cache keeps it.
      crossOrigin="anonymous"
      loading="lazy"
      sx={{ ...size, objectFit: "cover", borderRadius: 0.5, display: "block" }}
    />
  );
};

/** The box a value's mark stands in, whichever kind it is, so every name starts at one edge. */
const VALUE_LEAD_SIZE = 24;

/**
 * A value's mark: its own colour where the field has a vocabulary the app already speaks, and its
 * initial on a tile where it has none.
 *
 * Every value carries one, rather than only the coloured ones, because a group holds both — a genre
 * beside a director — and a row without a mark starts its name where the marked rows start their
 * mark. Both stand in one box for the same reason: a swatch reads at 18px and a letter needs 24,
 * and left at their own widths the two kinds of row indent differently. The tile says no more than
 * "a value", which is what a field with no vocabulary has to say.
 */
const ValueLead = ({ value, colour }: { value: string; colour: Colour | undefined }) => (
  <Box
    sx={{
      width: VALUE_LEAD_SIZE,
      height: VALUE_LEAD_SIZE,
      flexShrink: 0,
      display: "grid",
      placeItems: "center",
    }}
  >
    {colour ? (
      <Swatch
        colour={colour}
        size={18}
      />
    ) : (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          borderRadius: 0.75,
          display: "grid",
          placeItems: "center",
          backgroundColor: "action.selected",
          fontSize: 12,
          fontWeight: 700,
          color: "text.secondary",
        }}
      >
        {value.trim().charAt(0).toUpperCase()}
      </Box>
    )}
  </Box>
);

const yearLabel = (text: string) => (
  <Typography
    variant="caption"
    sx={MUTED_FIGURE_SX}
  >
    {text}
  </Typography>
);

const spanLabel = ([first, last]: [number, number]) => yearLabel(first === last ? String(first) : `${first} – ${last}`);

/** A tab as the palette can offer it: its name to match on, and the jump the rail's chips make. */
interface TabEntry {
  name: string;
  secondary: readonly string[];
  size: number;
  id: string;
  jump: () => void;
}

/**
 * A row of chips over one small index: everything before anything is typed, whichever the query
 * names once something is, and nothing at all where it names none — the row going rather than
 * standing empty.
 *
 * Both rows the box opens with are this. Stated once because it is one rule about what a chip row
 * *is*, and a third row would otherwise state it a third time; what each caller keeps is only how
 * its own entry becomes a chip.
 */
const chipsGroup = <T extends Searchable>(
  key: string,
  label: string,
  entries: readonly T[],
  query: string,
  toChip: (hit: Hit<T>) => PaletteHit,
): PaletteGroup | undefined => {
  const hits: Hit<T>[] = query.trim()
    ? rankHits(entries, query, entries.length).hits
    : entries.map((entry) => ({ entry }));
  if (hits.length === 0) return undefined;
  return { key, label, total: hits.length, layout: "chips", hits: hits.map(toChip) };
};

/**
 * The vocabularies the box can be held to, as a line of chips beside the tabs' own.
 *
 * Typing a category's name is the one thing in the box nobody can guess at: a work, a franchise and
 * a genre all answer their own names, where "genre" answers nothing until it is a hit of its own, so
 * a reader who never types the word never learns the mode exists. Offered outright before anything
 * is typed, all of them in the order the schemas declare them — the composing layer has no better
 * claim than the app's own about which vocabulary a reader wants, and the Go-to line above it
 * offers every tab on exactly that reasoning.
 *
 * Narrowed in place once something is typed, exactly as the tabs are: a category named is a chip
 * that stays where the reader last saw it and every other one falling away, which reads as the row
 * answering. Drawn as rows in a section of their own instead, the same names arrive in a second
 * place with the row above them still holding the full set — one thing said twice, and the answer
 * in the half the reader was not looking at.
 *
 * No lead, unlike the tabs, whose glyph is what the section rail names them by everywhere else. A
 * category has no mark of its own, and the initial on a tile a value falls back to would be a
 * letter repeating the word beside it.
 */
const categoryGroup = (categories: CategorySearchEntry[], query: string, scopeTo: (category: string) => void) =>
  chipsGroup("browse", "Browse by", categories, query, ({ entry, matched }) => ({
    key: entry.key,
    // Sentence case through the wording every picker in the app is read by, which is
    // length-preserving on a one-word label — so the run the ranker matched underlines at its own
    // index in it.
    title: keyLabel(entry.name),
    matched,
    onOpen: () => scopeTo(entry.category),
  }));

const tabGroup = (tabs: TabEntry[], query: string, scheme: Scheme, close: () => void) =>
  chipsGroup("tabs", "Go to", tabs, query, ({ entry, matched }) => {
    const tab = tabForId(entry.id);
    const Icon = tab?.icon;
    const colour = scheme === "dark" ? tab?.darkBar?.ink : tab?.primaryColour;
    return {
      key: entry.id,
      title: entry.name,
      matched,
      lead: Icon && <Icon sx={{ color: colour ?? "text.secondary" }} />,
      onOpen: () => {
        close();
        entry.jump();
      },
    };
  });

/**
 * Whether the value is its own category's name — "Anime" under `anime` — where stating both is the
 * one word twice. A split names its category after the half worth finding, so this is the split's
 * own case rather than a general risk.
 */
const namesItsCategory = (entry: AttributeEntry) => entry.label.toLowerCase() === entry.value.toLowerCase();

/**
 * The first tab recording a value, whose own schema is where that value's vocabulary is declared.
 * `buildAttributeIndex` walks the tabs in the app's own order, so this is the earliest of them
 * rather than whichever happened to be scanned first.
 */
const firstTab = (entry: AttributeEntry): string | undefined => Object.keys(entry.counts)[0];

/** Where a tab stands in the app's own order, which is the one every other list of tabs reads in. */
const TAB_ORDER = new Map(Tabs.map((tab, index) => [tab.id, index]));
const tabAt = (tab: string) => TAB_ORDER.get(tab) ?? TAB_ORDER.size;

/**
 * A tab's own mark. A medium's is the fill it is drawn in everywhere, which is the same dot the
 * summary above the strip states; the composing tab has no library and so no fill, and takes the
 * colour that tab is named in away from its own page. `tabInk` and not `barColour`: the bar's
 * colour on the dark paper is a 22% tint mixed *over* that paper, which a mark drawn in it sits on
 * at 1.25:1, where the ink it pairs with clears 7:1.
 */
const TabDot = ({ tab, scheme }: { tab: string; scheme: Scheme }) => {
  const medium = PAGE_MODULES[tab]?.medium;
  const held = tabForId(tab);
  return medium ? (
    <MediumDot
      medium={medium}
      scheme={scheme}
    />
  ) : (
    <Dot colour={held && (tabInk(held, scheme) as Colour | undefined)} />
  );
};

/**
 * What a value states while its readings are shut: how much of it each medium holds.
 *
 * Glyphs and not words. The readings spell a tab out ("Shows 75") because a chip is a press and
 * has to say what pressing it does; a line already carrying a mark, a name, a category and the
 * layer's own cut has room for four figures but not for four nouns, and the fill is what names a
 * medium wherever the app is too narrow for its word — the crossings' lanes and the genre
 * bridge's segments both.
 *
 * The media alone, where the strip beneath draws a chip per tab: the composing tab reads those
 * same works through the union, so a fifth dot here would count every one of them twice.
 *
 * A breakdown of one medium is nothing to break down — a gameplay value is Games and only Games,
 * and its dot states the figure the cut beside it already carries. Two are a comparison.
 */
const MediumCounts = ({ counts, scheme }: { counts: Partial<Record<Medium, number>>; scheme: Scheme }) => {
  const held = media.filter((medium) => counts[medium]);
  if (held.length < 2) return null;
  return (
    <Stack
      direction="row"
      spacing={1}
      // The breakdown asks for about 140px beside a name, a category and — on a franchise — its
      // years, which a 358px row spends on the name instead. Dropped on the row itself rather than
      // on each figure inside it, or the phone keeps an empty box and the gap either side of it.
      // The cut at the row's end stays at every width and opens the strip, so what a phone drops it
      // can still ask for.
      sx={{ alignItems: "center", flex: "none", display: { xs: "none", sm: "flex" } }}
    >
      {held.map((medium) => (
        <Typography
          key={medium}
          variant="caption"
          component="span"
          sx={{ ...MUTED_FIGURE_SX, display: "inline-flex", alignItems: "center" }}
        >
          <MediumDot
            medium={medium}
            scheme={scheme}
          />
          {format(counts[medium] ?? 0)}
        </Typography>
      ))}
    </Stack>
  );
};

/**
 * An attribute's rows per medium: the shelf's own figure broken down, its per-tab counts read back
 * as media. The composing tab is left out, reading those same rows through the union — counted, the
 * dots would add to twice what the cut beside them states.
 */
const mediumCounts = (entry: AttributeEntry): Partial<Record<Medium, number>> =>
  Object.fromEntries(media.map((medium) => [medium, entry.counts[MEDIA_MODULES[medium].tabId]]));

/**
 * The swatch an attribute wears, from the vocabulary the schema holding that category already
 * speaks for the field — a genre, a platform, a network, a certificate. Asked of the schema the hit
 * acts through, so the chip in This page and the hit in Find cannot colour one value two ways;
 * absent where a category has no vocabulary, which is where a swatch would teach a legend no chart
 * honours.
 */
const attributeColour = (entry: AttributeEntry, tab: string | undefined, scheme: Scheme) => {
  const schema = tab === undefined ? undefined : PAGE_MODULES[tab]?.filters;
  const category = schema?.categories.find((candidate) => (candidate.key as string) === entry.category);
  if (entry.level) return category?.group?.colourFor?.(entry.value, scheme);

  return category?.colourFor?.((tab && entry.values[tab]?.[0]) ?? entry.value, scheme);
};

/**
 * The palette wired to the union: the index over its items, the groups a query answers, what
 * stands under the box before anything is typed, and what a chosen hit opens.
 *
 * Opening a franchise closes the palette and mounts the franchise view; opening a work mounts its
 * own card already expanded, in a host the reader never sees, and unmounts it once its dialog has
 * left. The card is the one the item's home tab would open — `OmniCardMediaImage` dispatches by
 * medium — so a hit reached through search shows exactly what the same artwork shows anywhere.
 */
export const SearchSurface = ({
  open,
  mode,
  focusRequest,
  scope,
}: {
  open: boolean;
  mode: SearchMode;
  focusRequest: number;
  scope: string | null;
}) => {
  const scheme = useScheme();
  const navigate = useNavigate();
  const library = useLibrary();
  const items = library.items;
  const index = items && library.whole ? buildSearchIndex(items, library.whole) : undefined;
  // What a page's franchise picker cannot answer from its own rows, off the index that already
  // holds it: a second walk of the union here is a second answer to the question the strips, the
  // pickers and the box are meant to share. Taken whole rather than rebuilt around its one member,
  // so what the tally cache below is keyed on is an object with an owner and not a literal minted
  // per render. Absent until the union is, and a picker then falls back to its own rows, which is
  // the narrower list.
  const categoryContext: CategoryContext | undefined = index?.context;
  const [query, setQuery] = useState("");
  // The scan runs on the settled text: a keystroke lands in the box at once and the groups follow
  // at lower priority, so a fast typist is never held behind the previous letter's scan.
  const deferredQuery = useDeferredValue(query);
  const [picked, setPicked] = useState<Picked | null>(null);
  // Counted so that picking the item whose card is still leaving remounts the card rather than
  // reusing the instance, whose open flag is read once on mount.
  const [pickCount, setPickCount] = useState(0);
  // Set by the box's own transition: true from the moment it has finished leaving the screen, so a
  // close reached by Esc, the ✕ or a hit still fades out with its list under it.
  const [exited, setExited] = useState(true);
  const tabs: TabEntry[] = useOtherTabs().map((tab) => ({ name: tab.label, secondary: [], size: 0, ...tab }));
  // The page the box is standing over: its own schema, store, measures and rows. Subscribed to
  // through the store the tab's charts read, so a filter set here is the filter they are drawn by.
  const { tab, page: surface, state: pageState } = usePage();

  const close = closeSearch;

  const choose = (entry: FranchiseSearchEntry | ItemSearchEntry) => {
    close();
    setPickCount(pickCount + 1);
    setPicked(
      entry.kind === "franchise"
        ? { kind: "franchise", franchise: entry.franchise }
        : { kind: "item", item: entry.item },
    );
  };

  /**
   * What ↵ on an attribute does: set it on the tab that holds the category, and go there where
   * that tab is not the one being read.
   *
   * The value is added to whatever that tab already holds rather than replacing it, and the store
   * is the tab's own, module-scope one — which is what lets a filter be set on a page before that
   * page has ever been mounted.
   */
  const applyAttribute = (entry: PlacedAttribute) => {
    const store = PAGE_STORES[entry.tab];
    const held = fieldsOf(store.get())[entry.category] as readonly string[];
    store.dispatch(attributeAction(entry, held ?? []));
    close();
    // Which chip is the page already open is a comparison made here and nothing the strip says:
    // the five stand in one order on every tab, so pressing one is a place to be either way.
    if (entry.tab !== tab.id) {
      navigate(`/${entry.tab}`);
      window.scrollTo({ top: 0 });
    }
  };

  /** The same attribute across every library recording it, as the gallery's own drill-down draws a shelf. */
  const openShelf = (entry: AttributeEntry) => {
    close();
    setPicked({ kind: "shelf", attribute: entry });
  };

  /**
   * What stands at a value's left: the colour the schema holding that category already speaks for
   * the field, and the initial tile where it speaks none. A franchise is asked of its own table
   * rather than of a schema, so a series wears one mark across every reading of it.
   */
  const attributeLead = (entry: AttributeEntry, tab: string | undefined) => {
    const colour =
      entry.category === FRANCHISE_KEY
        ? franchiseToColour({ franchise: entry.value }, scheme) || undefined
        : attributeColour(entry, tab, scheme);
    return (
      <ValueLead
        value={entry.value}
        colour={colour}
      />
    );
  };

  const toHit = ({ entry, matched }: Hit<SearchEntry>): PaletteHit => {
    if (entry.kind === "value") {
      const attribute = entry.attribute;
      const franchise = entry.franchise;
      const readings: PaletteReading[] = [
        // The layer reading: the franchise's own view where the value is one, and otherwise the
        // shelf over every library recording it. One slot and one wording, both being the whole of
        // the value rather than a page held to it, and both leaving the reader where they are —
        // worded by what each will list, which for a franchise is the works its view collapses to
        // and not the union entries behind them.
        franchise
          ? { key: "view", label: `${all(franchise.works)} ›`, onOpen: () => choose(franchise) }
          : { key: "shelf", label: `${all(attribute.size)} ›`, onOpen: () => openShelf(attribute) },
        // One chip per tab holding the value, each named by that tab and counted in that tab's own
        // rows — the page the press leaves behind. The tab in hand is among them rather than
        // worded apart: a strip whose chips change with the tab is one a reader has to read again
        // on every page, where five in one order are five places, one of which happens to be here.
        //
        // That order is the app's own, which the bar, the rail and the Go-to line above all read
        // in: the index walks its pages by medium and appends the composing tab, and a reader who
        // has learned one order should not meet a second inside the same box.
        ...entry.placements
          .toSorted((a, b) => tabAt(a.tab) - tabAt(b.tab))
          .map((placed): PaletteReading => ({
            key: placed.tab,
            label: tabForId(placed.tab)?.name ?? placed.tab,
            count: format(placed.counts[placed.tab]),
            lead: (
              <TabDot
                tab={placed.tab}
                scheme={scheme}
              />
            ),
            onOpen: () => applyAttribute(placed),
          })),
      ];
      return {
        key: entry.key,
        title: attribute.value,
        matched,
        // What kind of value it is — "Genre", "Director", "Franchise" — and never its counts,
        // which the readings beneath already carry: a franchise stating "4 games" here beside a
        // "Games 4" chip is one fact said twice, and a franchise then reads differently
        // from every other value the box finds.
        category: namesItsCategory(attribute) ? undefined : (
          <Box
            component="span"
            sx={{ textTransform: "capitalize" }}
          >
            {attribute.label}
          </Box>
        ),
        trailing: franchise && spanLabel(franchise.span),
        lead: attributeLead(attribute, firstTab(attribute)),
        summary: (
          <MediumCounts
            counts={franchise ? franchise.counts : mediumCounts(attribute)}
            scheme={scheme}
          />
        ),
        readings,
      };
    }
    return {
      key: entry.key,
      title: entry.name,
      matched,
      facts: (
        <>
          <MediumDot
            medium={entry.medium}
            scheme={scheme}
          />
          {entry.facts}
        </>
      ),
      lead: (
        <Thumb
          item={entry.item}
          scheme={scheme}
        />
      ),
      trailing: yearLabel(String(entry.year)),
      onOpen: () => choose(entry),
    };
  };

  const finding = mode === "find";
  // On screen, which outlasts being open by the exit transition the dialog draws its children
  // through. `open` alone is what the box animates on; this is what its contents are built for.
  const drawn = open || !exited;

  // The surface is mounted for the life of the page once opened and subscribes to the store the
  // tab's own charts are drawn from, so it re-renders on every filter set anywhere. Both of the
  // answers only a drawn box shows — the scan across the four libraries, and the page's own
  // filtered population — are built behind that, or a chip pressed in the rail would pay for a
  // search nobody asked for.
  const paletteGroup = (group: SearchGroup): PaletteGroup => ({
    key: group.key,
    label: group.label,
    total: group.total,
    hits: group.hits.map(toHit),
    // The strip rule is the box's own rather than the shell's: `OPEN_STRIP_LIMIT` is what the two
    // layouts are switched between, and it belongs beside the readings it opens. The franchises
    // offered before a letter is typed are five and so stay shut, which their own line can afford
    // now that it carries the counts: what a strip adds there is a press, not a fact.
    alwaysOpen: group.hits.length <= OPEN_STRIP_LIMIT,
  });
  // The category the box is held to, resolved once and asked by everything below: the chip's word,
  // the two chip rows it suppresses and the values it lists are then one category rather than three
  // readings of one field. A scope naming a category the index no longer holds — a library narrowed
  // by guest mode since — is no scope at all, so the box comes back rather than emptying under a
  // word nothing can clear.
  const scoped = (scope && index?.categories.find((entry) => entry.category === scope)) || undefined;
  const found: PaletteGroup[] =
    !drawn || !finding || !index
      ? []
      : (scoped
          ? searchScope(index, scoped.category, deferredQuery)
          : deferredQuery.trim()
            ? searchUnion(index, deferredQuery)
            : recentValues(index, items ?? [], CURRENT_PLAINDATE)
        ).map(paletteGroup);
  // The tabs lead: a reader who typed a tab's name wants the page, and before anything is typed
  // they are the shortest way anywhere. Offered even while the libraries are still landing — but
  // not inside a scope, where the reader asked for one category's values and a line of places to go
  // is the one thing on the list that is not one of them. The vocabularies go with them.
  const goTo = scoped ? undefined : tabGroup(tabs, deferredQuery, scheme, close);
  // The query named the category, so inside it that query matches nothing: the field is handed back
  // empty for the vocabulary it now narrows. A chip is only visible once the query matches its own
  // name, and a category's name is never one of its values, so leaving the query would empty the
  // list every time the row is used as intended.
  const scopeTo = (category: string) => {
    setQuery("");
    setSearchScope(category);
  };
  const browse = scoped || !index ? undefined : categoryGroup(index.categories, deferredQuery, scopeTo);
  const groups = finding ? [goTo, browse, ...found].filter((group) => group !== undefined) : [];

  return (
    <>
      <SearchPalette
        open={open}
        mode={mode}
        onMode={setSearchMode}
        focusRequest={focusRequest}
        onClose={close}
        query={query}
        onQueryChange={setQuery}
        scope={scoped && { label: keyLabel(scoped.name), onClear: () => setSearchScope(null) }}
        groups={groups}
        loading={finding && !index}
        placeholder={
          // Unworded inside a scope: the chip beside the field already names the category, where a
          // placeholder pluralising the label itself reads "Narrow these watcheds…" on the one whose
          // label is a participle.
          scoped
            ? "Narrow these values…"
            : finding
              ? "Search games, shows, films, books and franchises"
              : "Narrow these lists…"
        }
        pageContent={
          surface ? (
            <SchemaPageControls
              schema={surface.schema}
              state={pageState}
              dispatch={surface.store.dispatch}
              data={surface.data}
              context={categoryContext}
              measures={surface.measures}
              earliestYear={surface.earliestYear}
              query={deferredQuery}
            />
          ) : (
            /* A page whose sheet is still in flight has no vocabularies to offer and no population
               to state, and the chord opens this pane from anywhere — the first seconds of a cold
               visit included. The line is what keeps that from reading as a surface that failed to
               draw. */
            <Typography
              variant="body2"
              sx={{ ...MUTED_FIGURE_SX, padding: 2 }}
            >
              Still loading this page&rsquo;s rows.
            </Typography>
          )
        }
        onDrawn={(shown) => setExited(!shown)}
        footer={
          !drawn || finding
            ? undefined
            : surface && (
                <>
                  {/* What the settings above have left, which the rail's chip states at every other
                    width: the figure and the controls that moved it belong on one surface, and the
                    Clear beside it is what undoes the difference. */}
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", flexGrow: 1 }}
                  >
                    {narrowedTo(
                      stated(pageCount(surface, pageState), surface.noun),
                      surface.store.activeCountOf(pageState),
                    )}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => surface.store.dispatch({ type: "resetFilters" })}
                  >
                    Clear
                  </Button>
                </>
              )
        }
        emptyState={
          <Typography
            variant="body2"
            sx={{ ...MUTED_FIGURE_SX, padding: 2 }}
          >
            Nothing named &ldquo;{query.trim()}&rdquo; in the libraries.
          </Typography>
        }
      />
      {picked?.kind === "franchise" && (
        <FranchiseView
          franchise={picked.franchise}
          epoch={unionEpoch(items ?? [], CURRENT_PLAINDATE)}
          onClose={() => setPicked(null)}
        />
      )}
      {picked?.kind === "shelf" && library.whole && (
        <AttributeShelf
          attribute={picked.attribute}
          library={library.whole}
          onClose={() => setPicked(null)}
        />
      )}
      {picked?.kind === "item" && (
        /* The card exists for its dialog alone. Fixed at a pixel rather than `display: none`, so
           its thumbnail loads and samples the colour the dialog is themed from; hidden from
           assistive technology and the pointer, since the dialog is what is on screen. */
        <Box
          aria-hidden
          sx={{ position: "fixed", width: "1px", height: "1px", overflow: "hidden", opacity: 0, pointerEvents: "none" }}
        >
          <OmniCardMediaImage
            key={`${pickCount}:${picked.item.key}`}
            item={picked.item}
            extractColour
            openOnMount
            onDetailClosed={() => setPicked(null)}
          />
        </Box>
      )}
    </>
  );
};

/**
 * Every work in the four libraries carrying one attribute, as the gallery draws a shelf.
 *
 * The cross-media reading of a hit that otherwise narrows one page: "Comedy" on the Games tab
 * filters Games, and this is the same value asked of the whole library instead. The drill-down the
 * gallery's own shelves open, over the same collapsed works and the same mixed-shape row sizing, so
 * a shelf reached from the box and a shelf reached from the wall are one thing.
 */
const AttributeShelf = ({
  attribute,
  library,
  onClose,
}: {
  attribute: AttributeEntry;
  library: Library;
  onClose: () => void;
}) => {
  const scheme = useScheme();
  const works = attributeWorks(library, attribute, CURRENT_PLAINDATE);

  return (
    <DrilldownDialog
      title={
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", minWidth: 0 }}
        >
          <span>{attribute.value}</span>
          {/* A toggle's label is the value itself, left blank on its entry: drawn anyway it would be
              an empty span the row's own gap still spaces out, leaving the title trailing. */}
          {attribute.label && (
            <Typography
              variant="body2"
              component="span"
              sx={{ ...MUTED_FIGURE_SX, textTransform: "capitalize" }}
            >
              {attribute.label}
            </Typography>
          )}
        </Stack>
      }
      onClose={onClose}
      content={works}
      cardKey={(item) => `attribute-${item.key}`}
      labelComponent={workLabels}
      band={mediumBand(scheme)}
      rowSizing={MIXED_CARD_SIZING}
      MediaComponent={OmniCardMediaImage}
    />
  );
};
