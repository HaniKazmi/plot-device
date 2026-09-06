import { Box, Button, Stack, Typography } from "@mui/material";
import { useDeferredValue, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swatch } from "../common/Card";
import { CURRENT_PLAINDATE } from "../common/date";
import { DrilldownDialog } from "../common/DrilldownDialog";
import { SchemaPageControls } from "../common/FilterControls";
import { narrowedTo, stated } from "../common/population";
import { LEAD_HEIGHT, LEAD_WIDTH, SearchPalette, type PaletteGroup, type PaletteHit } from "../common/SearchPalette";
import { closeSearch, setSearchMode, type SearchMode } from "../common/searchOpen";
import { fieldsOf, type PageSchema } from "../common/filterSchema";
import { rankHits, type Hit } from "../common/searchData";
import { MUTED_FIGURE_SX } from "../common/typography";
import { useScheme } from "../common/useScheme";
import { franchiseToColour, mediumToColour, mediumToLabel, mediumUnit, type Scheme } from "../utils/types";
import type { OmniItem } from "../common/medium";
import { MediaCounts, MediumDot } from "./MediaCounts";
import { MEDIA as MEDIA_MODULES, omniBanner } from "./media";
import OmniCardMediaImage from "./CardMediaImage";
import { MIXED_CARD_SIZING, workLabels } from "./cardData";
import { FranchiseView } from "./FranchiseView";
import { useLibrary, type Library } from "./library";
import { mediumBand } from "./mediumBand";
import { PAGE_STORES, pageCount, pageOf, usePageState } from "./pageState";
import {
  attributeAction,
  attributeWorks,
  buildSearchIndex,
  HITS_PER_GROUP,
  recentFranchises,
  searchUnion,
  unionEpoch,
  type AttributeEntry,
  type FranchiseSearchEntry,
  type ItemSearchEntry,
  type PlacedAttribute,
  type SearchEntry,
  type SearchIndex,
} from "./searchData";
import { mediumToShape } from "./types";
import Tabs, { useCurrentTab, useOtherTabs } from "../tabs";

/** What a chosen hit opens: a whole franchise, one work's own expanded card, or an attribute's shelf. */
type Picked =
  | { kind: "franchise"; franchise: string }
  | { kind: "item"; item: OmniItem }
  | { kind: "shelf"; attribute: AttributeEntry };

/** How many searches the palette remembers, and the key it keeps them under for the tab's life. */
const RECENT_LIMIT = 6;
const RECENT_KEY = "search-recent";

/**
 * The keys of the hits chosen lately, newest first. `sessionStorage` rather than `localStorage`
 * because a search is a thing done in a sitting; read inside the initialiser and behind a guard,
 * since the storage is absent where the module is imported without a window.
 */
const readRecent = (): string[] => {
  try {
    const held: unknown = JSON.parse(sessionStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(held) ? held.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
};

const writeRecent = (keys: string[]) => {
  try {
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(keys));
  } catch {
    // Storage full or refused: the list is a convenience, and the palette works without it.
  }
};

/**
 * The thumbnail at a hit's left: a banner at the lead's full width, a poster or a cover standing
 * tall inside it, and a tile in the medium's fill where the sheet holds no picture.
 */
const Thumb = ({ item, scheme }: { item: OmniItem; scheme: Scheme }) => {
  const src = omniBanner(item);
  const tall = mediumToShape(item.medium) !== "landscape";
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

/** A franchise's swatch where the table holds one; its initial on a tile where it does not. */
const FranchiseLead = ({ franchise, scheme }: { franchise: string; scheme: Scheme }) => {
  const colour = franchiseToColour({ franchise }, scheme);
  if (colour) {
    return (
      <Swatch
        colour={colour}
        size={18}
      />
    );
  }
  return (
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: 0.75,
        display: "grid",
        placeItems: "center",
        backgroundColor: "action.selected",
        fontSize: 12,
        fontWeight: 700,
        color: "text.secondary",
      }}
    >
      {franchise.trim().charAt(0).toUpperCase()}
    </Box>
  );
};

const franchiseFacts = (entry: FranchiseSearchEntry, scheme: Scheme) => (
  <MediaCounts
    counts={entry.counts}
    wordFor={mediumUnit}
    scheme={scheme}
  />
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
 * The other tabs as a group of hits, for a reader switching pages from the keyboard: every tab
 * before anything is typed, and whichever the query names once something is. The current tab is
 * absent, as it is from the rail — the box offers movement, not orientation. Nothing is
 * remembered about a jump, since the tab strip already says where the reader is.
 */
const tabGroup = (tabs: TabEntry[], query: string, scheme: Scheme, close: () => void): PaletteGroup | undefined => {
  const hits: Hit<TabEntry>[] = query.trim()
    ? rankHits(tabs, query, tabs.length).hits
    : tabs.map((entry) => ({ entry }));
  if (hits.length === 0) return undefined;
  return {
    key: "tabs",
    label: "Go to",
    total: hits.length,
    layout: "chips",
    hits: hits.map(({ entry, matched }) => {
      const tab = Tabs.find((candidate) => candidate.id === entry.id);
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
    }),
  };
};

/** Where the hits' keys and entries meet, so a remembered key finds its entry again. */
const entriesByKey = (index: SearchIndex): Map<string, SearchEntry> =>
  new Map<string, SearchEntry>([...index.franchises, ...index.items].map((entry) => [entry.key, entry]));

/**
 * What an attribute hit is called: the value alone on the tab being read, and the tab's own name
 * before it anywhere else — "Shows · Netflix" is a place, and the place is half of what it says.
 *
 * The matched run is moved along by the prefix, since the ranker found it in the value and the box
 * underlines it on the title as drawn.
 */
const attributeTitle = (entry: PlacedAttribute, matched: [number, number] | undefined) => {
  if (entry.here) return { title: entry.value, matched };
  const prefix = `${mediumToLabel(entry.medium!)} · `;
  return {
    title: `${prefix}${entry.value}`,
    matched: matched && ([matched[0] + prefix.length, matched[1] + prefix.length] as [number, number]),
  };
};

/**
 * The line under an attribute hit: what the category is, and what it holds — on the tab the hit
 * acts on, or across every medium for a tab that is no medium.
 */
const attributeFacts = (entry: PlacedAttribute, scheme: Scheme) => (
  <MediaCounts
    counts={entry.counts}
    media={entry.medium ? [entry.medium] : undefined}
    // The tab's own noun and not the union's unit: the count is that tab's rows, and a show is a
    // show there where the union counts the seasons inside it.
    wordFor={(medium, count) => stated(count, MEDIA_MODULES[medium].noun)}
    scheme={scheme}
    lead={
      <Box
        component="span"
        sx={{ textTransform: "capitalize" }}
      >
        {entry.label}
      </Box>
    }
  />
);

/**
 * The swatch an attribute wears, from the vocabulary its own tab already speaks for that field —
 * a genre, a platform, a network, a certificate. Asked of the schema the hit acts through, so the
 * chip in This page and the hit in Find cannot colour one value two ways; absent where a category
 * has no vocabulary, which is where a swatch would teach a legend no chart honours.
 */
const attributeColour = (entry: PlacedAttribute, schema: PageSchema, scheme: Scheme) => {
  const source = entry.medium ? MEDIA_MODULES[entry.medium].filters : schema;
  const category = source.categories.find((candidate) => (candidate.key as string) === entry.category);
  const values = entry.medium ? entry.values[entry.medium] : undefined;
  return category?.colourFor?.(values?.[0] ?? entry.value, scheme);
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
}: {
  open: boolean;
  mode: SearchMode;
  focusRequest: number;
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
  const [recent, setRecent] = useState<string[]>(readRecent);
  // Set by the box's own transition: true from the moment it has finished leaving the screen, so a
  // close reached by Esc, the ✕ or a hit still fades out with its list under it.
  const [exited, setExited] = useState(true);
  const tabs: TabEntry[] = useOtherTabs().map((tab) => ({ name: tab.label, secondary: [], size: 0, ...tab }));
  // The page the box is standing over: its own schema, store, measures and rows. Subscribed to
  // through the store the tab's charts read, so a filter set here is the filter they are drawn by.
  const tab = useCurrentTab();
  const surface = pageOf(tab.id, library);
  const [pageState] = usePageState(tab.id);

  const close = closeSearch;

  const choose = (entry: FranchiseSearchEntry | ItemSearchEntry) => {
    const kept = [entry.key, ...recent.filter((key) => key !== entry.key)].slice(0, RECENT_LIMIT);
    setRecent(kept);
    writeRecent(kept);
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

  /** The same attribute across all four libraries, as the gallery's own drill-down draws a shelf. */
  const openShelf = (entry: PlacedAttribute) => {
    close();
    setPicked({ kind: "shelf", attribute: entry });
  };

  const toHit = ({ entry, matched }: Hit<SearchEntry>): PaletteHit => {
    if (entry.kind === "attribute") {
      const named = attributeTitle(entry, matched);
      const colour = surface && attributeColour(entry, surface.schema, scheme);
      return {
        key: entry.key,
        title: named.title,
        matched: named.matched,
        facts: attributeFacts(entry, scheme),
        lead: colour ? (
          <Swatch
            colour={colour}
            size={18}
          />
        ) : undefined,
        onOpen: () => applyAttribute(entry),
        // The same value across all four libraries, which is the other question a genre asks and
        // the one no tab's own filters can answer.
        secondary: { label: "shelf", onOpen: () => openShelf(entry) },
      };
    }
    if (entry.kind === "franchise") {
      return {
        key: entry.key,
        title: entry.franchise,
        matched,
        facts: franchiseFacts(entry, scheme),
        lead: (
          <FranchiseLead
            franchise={entry.franchise}
            scheme={scheme}
          />
        ),
        trailing: spanLabel(entry.span),
        onOpen: () => choose(entry),
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
  const found: PaletteGroup[] =
    !drawn || !finding || !index
      ? []
      : deferredQuery.trim()
        ? searchUnion(index, deferredQuery, page).map((group) => ({
            key: group.key,
            label: group.label,
            total: group.total,
            hits: group.hits.map(toHit),
          }))
        : openingGroups(index, items ?? [], recent, toHit);
  // The tabs lead: a reader who typed a tab's name wants the page, and before anything is typed
  // they are the shortest way anywhere. Offered even while the libraries are still landing.
  const goTo = tabGroup(tabs, deferredQuery, scheme, close);
  const groups = finding ? (goTo ? [goTo, ...found] : found) : [];

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
        groups={groups}
        loading={finding && !index}
        placeholder={finding ? "Search games, shows, films, books and franchises" : "Narrow these lists…"}
        pageContent={
          surface && (
            <SchemaPageControls
              schema={surface.schema}
              state={pageState}
              dispatch={surface.store.dispatch}
              data={surface.data}
              measures={surface.measures}
              earliestYear={surface.earliestYear}
              query={deferredQuery}
            />
          )
        }
        chordHint="shelf"
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
          sx={{ position: "fixed", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
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
 * What the box offers before a letter is typed: the hits chosen lately, then the franchises met
 * most recently — the series the reader is in the middle of, which is the likeliest thing to be
 * looking for. Remembered keys whose entries have gone, a work hidden by guest mode since, are
 * dropped rather than shown as blanks.
 */
const openingGroups = (
  index: SearchIndex,
  items: OmniItem[],
  recent: string[],
  toHit: (hit: Hit<SearchEntry>) => PaletteHit,
): PaletteGroup[] => {
  const byKey = entriesByKey(index);
  const remembered = recent.map((key) => byKey.get(key)).filter((entry) => entry !== undefined);
  const lately = recentFranchises(items, CURRENT_PLAINDATE, HITS_PER_GROUP)
    .map((franchise) => byKey.get(`franchise:${franchise}`))
    .filter((entry): entry is FranchiseSearchEntry => entry !== undefined);

  return [
    ...(remembered.length > 0
      ? [
          {
            key: "recent",
            label: "Recent searches",
            total: remembered.length,
            hits: remembered.map((entry) => toHit({ entry })),
          },
        ]
      : []),
    ...(lately.length > 0
      ? [
          {
            key: "lately",
            label: "Franchises met lately",
            total: lately.length,
            hits: lately.map((entry) => toHit({ entry })),
          },
        ]
      : []),
  ];
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
          <Typography
            variant="body2"
            component="span"
            sx={{ ...MUTED_FIGURE_SX, textTransform: "capitalize" }}
          >
            {attribute.label}
          </Typography>
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
