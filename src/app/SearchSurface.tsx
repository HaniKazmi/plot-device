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
import { fieldsOf, type PageSchema } from "../common/filterSchema";
import { FRANCHISE_KEY } from "../common/filterSchema";
import { rankHits, type Hit, type Searchable } from "../common/searchData";
import { MUTED_FIGURE_SX } from "../common/typography";
import { format } from "../utils/mathUtils";
import { useScheme } from "../common/useScheme";
import {
  franchiseToColour,
  mediumToColour,
  mediumToLabel,
  type Colour,
  type Medium,
  type Scheme,
} from "../utils/types";
import type { OmniItem } from "../common/medium";
import { MediumDot } from "./MediaCounts";
import { MEDIA as MEDIA_MODULES, omniArtwork } from "./media";
import OmniCardMediaImage from "./CardMediaImage";
import { MIXED_CARD_SIZING, workLabels } from "./cardData";
import { FranchiseView } from "./FranchiseView";
import { useLibrary, type Library } from "./library";
import { mediumBand } from "./mediumBand";
import { usePage } from "./page";
import { PAGE_STORES, pageCount } from "./pageState";
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
import { tabForId, useOtherTabs } from "../tabs";

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
 * The first medium recording a value, whose own schema is where that value's vocabulary is
 * declared. `buildAttributeIndex` walks the media in the app's own order, so this is the earliest
 * of them rather than whichever happened to be scanned first.
 */
const firstMedium = (entry: AttributeEntry): Medium | undefined => (Object.keys(entry.counts) as Medium[])[0];

/**
 * The swatch an attribute wears, from the vocabulary the schema holding that category already
 * speaks for the field — a genre, a platform, a network, a certificate. Asked of the schema the hit
 * acts through, so the chip in This page and the hit in Find cannot colour one value two ways;
 * absent where a category has no vocabulary, which is where a swatch would teach a legend no chart
 * honours.
 */
/**
 * What a value states while its readings are shut: how much of it each medium holds, and the whole.
 *
 * Glyphs and not words. The readings spell a medium out ("Shows 75") because a chip is a press and
 * has to say what pressing it does; a line already carrying a mark, a name and a category has room
 * for four figures but not for four nouns, and the fill is what names a medium wherever the app is
 * too narrow for its word — the crossings' lanes and the genre bridge's segments both.
 *
 * The total is the figure the layer reading states, so the line and the chip under it cannot
 * disagree about how much there is: a franchise counts the works its view lists, an attribute the
 * rows its shelf is over.
 */
const ValueCounts = ({
  counts,
  total,
  scheme,
}: {
  counts: Partial<Record<Medium, number>>;
  total: number;
  scheme: Scheme;
}) => (
  <Stack
    direction="row"
    spacing={1}
    sx={{ alignItems: "center", flex: "none" }}
  >
    {media
      .filter((medium) => counts[medium])
      .map((medium) => (
        <Typography
          key={medium}
          variant="caption"
          component="span"
          // The breakdown asks for about 140px beside a name, a category and — on a franchise — its
          // years, which a 358px row spends on the name instead. The total stays at every width and
          // the strip is one press away, so what a phone drops it can still ask for.
          sx={{ ...MUTED_FIGURE_SX, display: { xs: "none", sm: "inline-flex" }, alignItems: "center" }}
        >
          <MediumDot
            medium={medium}
            scheme={scheme}
          />
          {format(counts[medium] ?? 0)}
        </Typography>
      ))}
    <Typography
      variant="caption"
      component="span"
      sx={{ ...MUTED_FIGURE_SX, color: "text.primary", fontWeight: 600 }}
    >
      {format(total)}
    </Typography>
  </Stack>
);

const attributeColour = (
  entry: AttributeEntry,
  schema: PageSchema | undefined,
  medium: Medium | undefined,
  scheme: Scheme,
) => {
  const category = schema?.categories.find((candidate) => (candidate.key as string) === entry.category);
  if (entry.level) return category?.group?.colourFor?.(entry.value, scheme);

  const values = medium ? entry.values[medium] : undefined;
  return category?.colourFor?.(values?.[0] ?? entry.value, scheme);
};

/** The schema an attribute's own vocabulary is declared in: its medium's, or the composing tab's. */
const schemaOf = (medium: Medium | undefined, page: PageSchema | undefined) =>
  medium ? MEDIA_MODULES[medium].filters : page;

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
    if (!entry.here) {
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
  const attributeLead = (entry: AttributeEntry, medium: Medium | undefined) => {
    const colour =
      entry.category === FRANCHISE_KEY
        ? franchiseToColour({ franchise: entry.value }, scheme) || undefined
        : attributeColour(entry, schemaOf(medium, surface?.schema), medium, scheme);
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
          ? { key: "view", label: `${all(franchise.works)} ›`, line: 1, onOpen: () => choose(franchise) }
          : { key: "shelf", label: `${all(attribute.size)} ›`, line: 1, onOpen: () => openShelf(attribute) },
        ...entry.placements.map((placed): PaletteReading => ({
          key: placed.tab,
          label: placed.here ? "Filter this page" : mediumToLabel(placed.medium!),
          // The tab's own rows, and only where that tab is a medium: the composing tab counts a
          // show once where the union it filters counts the seasons inside it, so a figure here
          // would disagree with the population the press leaves behind.
          count: placed.medium ? format(placed.counts[placed.medium] ?? 0) : undefined,
          lead: placed.medium && (
            <MediumDot
              medium={placed.medium}
              scheme={scheme}
            />
          ),
          // The readings that leave the reader on this page lead; the ones that carry them to
          // another tab stand on the line below.
          line: placed.here ? 1 : 2,
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
        lead: attributeLead(attribute, firstMedium(attribute)),
        summary: (
          <ValueCounts
            counts={attribute.counts}
            total={franchise ? franchise.works : attribute.size}
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
  const page = surface && { tabId: tab.id, categories: surface.schema.categories.map((category) => category.key) };

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
          ? searchScope(index, scoped.category, deferredQuery, page)
          : deferredQuery.trim()
            ? searchUnion(index, deferredQuery, page)
            : recentValues(index, items ?? [], CURRENT_PLAINDATE, page)
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
