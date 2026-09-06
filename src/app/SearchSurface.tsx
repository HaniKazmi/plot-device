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
import { franchiseToColour, mediumToColour, mediumToLabel, mediumUnit, type Medium, type Scheme } from "../utils/types";
import type { OmniItem } from "../common/medium";
import { MediaCounts, MediumDot } from "./MediaCounts";
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
    }),
  };
};

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
 * acts on, across every medium for a tab that is no medium, and across every medium recording it
 * for a shelf, which stands on no tab at all.
 *
 * The category's name leads the line except where it is blank, which is a toggle's entry: a
 * toggle's label *is* the value, so a lead there would repeat the title above it.
 */
const attributeFacts = (entry: AttributeEntry, medium: Medium | undefined, scheme: Scheme) => (
  <MediaCounts
    counts={entry.counts}
    media={medium ? [medium] : undefined}
    // The tab's own noun and not the union's unit: the count is that tab's rows, and a show is a
    // show there where the union counts the seasons inside it.
    wordFor={(each, count) => stated(count, MEDIA_MODULES[each].noun)}
    scheme={scheme}
    lead={
      entry.label ? (
        <Box
          component="span"
          sx={{ textTransform: "capitalize" }}
        >
          {entry.label}
        </Box>
      ) : undefined
    }
  />
);

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
 *
 * A shelf toggle is looked up beside the categories, and only one carrying `shelf`: the Omnibus's
 * own toggles are keyed by medium, so a category keyed `show` on some later tab would otherwise
 * take a medium switch's colour.
 */
const attributeColour = (
  entry: AttributeEntry,
  schema: PageSchema | undefined,
  medium: Medium | undefined,
  scheme: Scheme,
) => {
  const category = schema?.categories.find((candidate) => (candidate.key as string) === entry.category);
  const toggle = schema?.toggles.find((candidate) => candidate.shelf && (candidate.key as string) === entry.category);
  const values = medium ? entry.values[medium] : undefined;
  const value = values?.[0] ?? entry.value;
  return (category ?? toggle)?.colourFor?.(value, scheme);
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
   * What stands at an attribute row's left: the franchise's own lead where the category is the
   * franchise, so a series wears one mark across all three of its readings — and the initial tile
   * that lead falls back to, most of the column carrying no colour of its own.
   */
  const attributeLead = (entry: AttributeEntry, medium: Medium | undefined) => {
    if (entry.category === "franchise") {
      return (
        <FranchiseLead
          franchise={entry.value}
          scheme={scheme}
        />
      );
    }
    const colour = attributeColour(entry, schemaOf(medium, surface?.schema), medium, scheme);
    return colour ? (
      <Swatch
        colour={colour}
        size={18}
      />
    ) : undefined;
  };

  const toHit = ({ entry, matched }: Hit<SearchEntry>): PaletteHit => {
    if (entry.kind === "shelf") {
      const attribute = entry.attribute;
      return {
        key: entry.key,
        title: attribute.value,
        matched,
        facts: attributeFacts(attribute, undefined, scheme),
        lead: attributeLead(attribute, firstMedium(attribute)),
        onOpen: () => openShelf(attribute),
      };
    }
    if (entry.kind === "attribute") {
      const named = attributeTitle(entry, matched);
      return {
        key: entry.key,
        title: named.title,
        matched: named.matched,
        facts: attributeFacts(entry, entry.medium, scheme),
        lead: attributeLead(entry, entry.medium),
        onOpen: () => applyAttribute(entry),
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
        : openingGroups(index, items ?? [], toHit);
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
 * What the box offers before a letter is typed: the franchises met most recently — the series the
 * reader is in the middle of, which is the likeliest thing to be looking for.
 *
 * A franchise the index no longer holds, one hidden by guest mode since, is dropped rather than
 * shown as a blank.
 */
const openingGroups = (
  index: SearchIndex,
  items: OmniItem[],
  toHit: (hit: Hit<SearchEntry>) => PaletteHit,
): PaletteGroup[] => {
  const byKey = new Map(index.franchises.map((entry) => [entry.key, entry]));
  const lately = recentFranchises(items, CURRENT_PLAINDATE, HITS_PER_GROUP)
    .map((franchise) => byKey.get(`franchise:${franchise}`))
    .filter((entry) => entry !== undefined);

  if (lately.length === 0) return [];
  return [
    {
      key: "lately",
      label: "Franchises met lately",
      total: lately.length,
      hits: lately.map((entry) => toHit({ entry })),
    },
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
