import { Box, Stack, Typography } from "@mui/material";
import { useDeferredValue, useState } from "react";
import { Swatch } from "../common/Card";
import { CURRENT_PLAINDATE } from "../common/date";
import { LEAD_HEIGHT, LEAD_WIDTH, SearchPalette, type PaletteGroup, type PaletteHit } from "../common/SearchPalette";
import { closeSearch } from "../common/searchOpen";
import { rankHits, type Hit } from "../common/searchData";
import { MUTED_FIGURE_SX } from "../common/typography";
import { useScheme } from "../common/useScheme";
import { franchiseToColour, MEDIA, mediumToColour, mediumUnit, type Medium, type Scheme } from "../utils/types";
import { omniBanner, type OmniItem } from "./adapter";
import OmniCardMediaImage from "./CardMediaImage";
import { FranchiseView } from "./FranchiseView";
import { useOmniItems } from "./omniItems";
import {
  buildSearchIndex,
  HITS_PER_GROUP,
  recentFranchises,
  searchUnion,
  unionEpoch,
  type FranchiseSearchEntry,
  type SearchEntry,
  type SearchIndex,
} from "./searchData";
import { mediumToShape } from "./types";
import Tabs, { useOtherTabs } from "../tabs";

/** What a chosen hit opens: the whole franchise, or one work's own expanded card. */
type Picked = { kind: "franchise"; franchise: string } | { kind: "item"; item: OmniItem };

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

/** A medium's dot, the palette's one word for which library a hit is from. */
const MediumDot = ({ medium, scheme }: { medium: Medium; scheme: Scheme }) => (
  <Box
    component="span"
    sx={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      backgroundColor: mediumToColour(medium, scheme),
      marginRight: 0.75,
      verticalAlign: "0.05em",
      flexShrink: 0,
    }}
  />
);

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
  <Stack
    direction="row"
    spacing={1.25}
    component="span"
  >
    {MEDIA.map((medium) => {
      const count = entry.counts[medium];
      if (!count) return null;
      return (
        <Box
          key={medium}
          component="span"
          sx={{ display: "inline-flex", alignItems: "center" }}
        >
          <MediumDot
            medium={medium}
            scheme={scheme}
          />
          {mediumUnit(medium, count)}
        </Box>
      );
    })}
  </Stack>
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
 * The palette wired to the union: the index over its items, the groups a query answers, what
 * stands under the box before anything is typed, and what a chosen hit opens.
 *
 * Opening a franchise closes the palette and mounts the franchise view; opening a work mounts its
 * own card already expanded, in a host the reader never sees, and unmounts it once its dialog has
 * left. The card is the one the item's home tab would open — `OmniCardMediaImage` dispatches by
 * medium — so a hit reached through search shows exactly what the same artwork shows anywhere.
 */
export const SearchSurface = ({ open, focusRequest }: { open: boolean; focusRequest: number }) => {
  const scheme = useScheme();
  const items = useOmniItems();
  const index = items ? buildSearchIndex(items) : undefined;
  const [query, setQuery] = useState("");
  // The scan runs on the settled text: a keystroke lands in the box at once and the groups follow
  // at lower priority, so a fast typist is never held behind the previous letter's scan.
  const deferredQuery = useDeferredValue(query);
  const [picked, setPicked] = useState<Picked | null>(null);
  // Counted so that picking the item whose card is still leaving remounts the card rather than
  // reusing the instance, whose open flag is read once on mount.
  const [pickCount, setPickCount] = useState(0);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const tabs: TabEntry[] = useOtherTabs().map((tab) => ({ name: tab.label, secondary: [], size: 0, ...tab }));

  const close = closeSearch;

  const choose = (entry: SearchEntry) => {
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

  const toHit = ({ entry, matched }: Hit<SearchEntry>): PaletteHit => {
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

  const found: PaletteGroup[] = !index
    ? []
    : deferredQuery.trim()
      ? searchUnion(index, deferredQuery).map((group) => ({
          key: group.key,
          label: group.label,
          total: group.total,
          hits: group.hits.map(toHit),
        }))
      : openingGroups(index, items ?? [], recent, toHit);
  // The tabs lead: a reader who typed a tab's name wants the page, and before anything is typed
  // they are the shortest way anywhere. Offered even while the libraries are still landing.
  const goTo = tabGroup(tabs, deferredQuery, scheme, close);
  const groups = goTo ? [goTo, ...found] : found;

  return (
    <>
      <SearchPalette
        open={open}
        focusRequest={focusRequest}
        onClose={close}
        query={query}
        onQueryChange={setQuery}
        groups={groups}
        loading={!index}
        placeholder="Search games, shows, films, books and franchises"
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
