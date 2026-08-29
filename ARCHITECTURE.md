# Architecture

Plot Device is a client-only React SPA (~5,600 lines of TypeScript) that turns personal tracking spreadsheets into interactive dashboards. This document explains how the pieces fit together and why they are shaped the way they are. For working conventions and the verification loop, see [AGENTS.md](./AGENTS.md); for setup, see [README.md](./README.md).

## 1. System context

```
┌──────────────┐   OAuth (GIS)    ┌───────────────────┐
│   Browser    │ ───────────────► │  Google Identity  │
│  (the whole  │ ◄─── token ───── │     Services      │
│  application)│                  └───────────────────┘
│              │
│              │  sheets.values.get (read-only scope)
│              │ ───────────────► ┌───────────────────┐
│              │ ◄── string[][] ── │ Google Sheets API │
└──────┬───────┘                  └───────────────────┘
       │
       │ static assets
       ▼
┌──────────────────────┐
│ GitHub Pages         │
│ (plot.hani.fyi)      │
└──────────────────────┘
```

There is no backend, no database, and no build-time data. Three Google Sheets are the system of record; the browser authenticates directly, fetches whole ranges, and does every parse, join, aggregation and render locally. Deployment is a static bundle pushed to GitHub Pages by `npm run deploy`.

**Why this shape.** The dataset is one person's media history — thousands of rows, not millions. Editing is already comfortable in Sheets, so building a write path and a server would add operational cost for no gain. The consequences are accepted deliberately: every visitor must authenticate, each session refetches whole sheets, and all computation is on the main thread. The caching layer (§4) exists to make that trade tolerable.

## 2. Layers

```
                    ┌───────────────────────────────────────────┐
  routing / shell   │  App → Google → NavBar + <Outlet>         │
                    └───────────────────┬───────────────────────┘
                                        │
                    ┌───────────────────▼───────────────────────┐
  configuration     │  tabs.ts — sheet id, range, route, colours │
                    └───────────────────┬───────────────────────┘
                                        │
                    ┌───────────────────▼───────────────────────┐
  transport + auth  │  GoogleAuthContext · useData (cache)       │
                    └───────────────────┬───────────────────────┘
                                        │
                    ┌───────────────────▼───────────────────────┐
  domain            │  vg/ · show/ · movie/ · holiday/           │
                    │  model, converter, filters, adapters       │
                    └───────────────────┬───────────────────────┘
                                        │
                    ┌───────────────────▼───────────────────────┐
  presentation      │  common/ — generic, domain-blind shells    │
                    │  Barchart · Sunburst · Timeline · Stats    │
                    │  Card · Finished · SelectionComponents     │
                    │  filterReducer (generic filter machinery)  │
                    └───────────────────────────────────────────┘
                                        │
                    ┌───────────────────▼───────────────────────┐
  primitives        │  common/date · utils/{types,array,map,     │
                    │  colour,math}                             │
                    └───────────────────────────────────────────┘
```

The load-bearing rule is the boundary between the bottom two layers and the domain layer above them: **`common/` and `utils/` never import from `vg/`, `show/`, `movie/` or `holiday/`.** Generic components receive behaviour as props and callbacks; domain folders supply the meaning. Everything reusable in this codebase lives on that seam.

The rule holds with no exceptions, and the direction matters. Where the shared layer needs a domain vocabulary, it declares its own and lets each domain's type stay assignable to it — `utils/types.ts` owns a `ColourableStatus` union that both `show/types.ts` and `vg/types.ts` satisfy, rather than importing their `Status` unions. Inverting that would create an import cycle, since both domains import `statusToColour` back out.

## 3. The data pipeline

```
tabs.ts                    { spreadsheetId, range }
   │
   ▼
GoogleAuthContext          gapi.client.sheets.spreadsheets.values.get
   │                       → string[][]  (raw grid, header row first)
   ▼
utils/arrayUtils           arrayToJson()
   │                       → Record<string, string>[]  (header-keyed rows)
   ▼
<domain>/<Domain>.tsx      jsonConverter()
   │                       → VideoGame[] | Show[] | Movie[] | Holiday[]
   ▼
common/useData             module-level Map + localStorage
   │                       → [data, dataLoaded]
   ▼
common/filterReducer       reducer composes predicates → data.filter(...)
   │                       (domain supplies only its own filters())
   │
   ▼
<domain>/Graphs.tsx        lazy-loaded; fans data out to common/ shells
```

Each stage has exactly one job, and only `jsonConverter` knows anything about a specific spreadsheet's column names. That is what makes a new data source cheap to add (§8).

Converters do real modelling work, not just field renaming:

- **`vg/`** derives `company` by splitting the platform string, folds a `"Party"` status into `status: "Endless"` plus a `party` boolean, and computes `numDays` from the date pair.
- **`show/`** reduces a _flat_ sheet into a _nested_ one. Rows with a non-empty `Show` column open a new show; subsequent rows are seasons belonging to it. Afterwards it rolls season totals up into the parent (`startDate`, `endDate`, episode and minute sums) and asserts date ordering with `console.assert`. Seasons keep a `show` back-reference, which makes the object graph cyclic — see §4.
- **`movie/`** drops rows with an empty `Genre`, which is how partially-entered rows are excluded.

## 4. Caching and hydration

`common/useData.ts` implements a two-tier cache:

| Tier                         | Lifetime      | Purpose                                                              |
| ---------------------------- | ------------- | -------------------------------------------------------------------- |
| `CACHE` (module-level `Map`) | Page session  | Survives route changes and component unmounts; suppresses refetching |
| `localStorage`               | Across visits | Lets the dashboard paint before authentication completes             |

On mount the hook returns cached data synchronously from its `useState` initialiser, so charts render immediately from the previous visit's data. Once `apiReady` becomes true it fetches, replaces the data, sets `dataLoaded` (which drives the "refreshed" snackbar in `vg/`), and rewrites the cache.

Two subtleties live in the serialisation boundary, and both are easy to break:

1. **The cycle.** `Season.show` points back at its parent `Show`, so `JSON.stringify` would recurse forever. `useData` takes an optional `replacer` and an optional `reviver`, and `show/converter.ts` supplies both as a matched pair (`dropSeasonParents` / `reviveSeasonParents`): one drops the `show` key on write, the other re-attaches the back-reference on read. Neither rule lives in the hook — a domain concern would otherwise silently eat any future field named `show` in another domain. Both are module-scope constants so the fetch effect can depend on them without re-firing. Any future model with parent pointers needs the same pair.
2. **Date revival.** The `JSON.parse` reviver converts **any key whose name contains `"Date"`** into a `PlainDate`. It is a deliberate convention, but it means a non-date field called e.g. `updateDate` would be silently corrupted on reload.

Cache keys are per-domain literals (`"vg-data-cache"`, `"show-data-cache"`, `"movie-data-cache"`). There is no schema version in the key, so a change to a domain model's shape will meet stale cached objects on existing browsers.

## 5. Authentication

`contexts/GoogleAuthContext.tsx` owns the whole auth lifecycle:

- **Script loading.** The GIS (`accounts.google.com/gsi/client`) and gapi (`apis.google.com/js/api.js`) scripts are injected at runtime by an internal `useScript` hook, which is idempotent — it reuses an existing tag and checks a readiness predicate before attaching a load listener. `App.tsx` calls React's `preload()` for both so the network fetch starts during the initial render.
- **Token storage.** The OAuth token is wrapped with an absolute `expiry` and stored in `sessionStorage`. `getValidToken` evicts it once expired, so a stale token never reaches gapi.
- **Readiness.** `apiReady = tokenSet && apiReadyToFetch` — a valid token _and_ an initialised gapi client. Consumers wait on this single flag rather than tracking two async loads.
- **Failure handling.** A rejected `values.get` clears `tokenSet`, which flips the NavBar back to an "Authorise" button. Expiry mid-session therefore self-heals into a re-prompt rather than an error state.

The requested scope is `spreadsheets.readonly`. The application has no write path by design.

`authorise` and `revoke` are exposed as `undefined` when unavailable, so `NavBar` renders its three states (Authorising / Authorise / Revoke) by presence-checking rather than by reading separate booleans.

## 6. Presentation subsystems

### Highcharts wrapper

`src/highcharts.ts` is the single import point for charting. It applies global defaults once (no credits, no titles, accessibility off) and re-exports the declarative components. Charts are composed as JSX (`<Chart><XAxis/><Series/></Chart>`) rather than configured as one options blob.

### Barchart — `common/Barchart.tsx`

The most involved shell. It accepts `data` as a _function of_ `cumulative` and returns flat `{ name, date, colour, value }` records; the component owns everything after that:

1. `groupDate()` (in `common/barchartData.ts`, alongside the two transforms below) pivots the flat records into a dense `BarchartTable` (`group × date` matrix). Dates are densified by walking `PlainDate.iterateToDate`, so gaps become real columns instead of being skipped. Series are sorted by total, and leading cells before a series' first data point are set to `null` so lines start where the data does rather than at zero.
2. `convertToCumulative()` and `convertToRanking()` are pure transforms over that matrix — cumulative area and bump-chart ranking are views of the same pivot, not separate queries.
3. Clicking a column isolates that series (and clicking again restores all), implemented through Highcharts' plot-options event rather than React state.

Callers choose the measure (episodes vs hours, games vs hours) and pass `postAggregate`, a scalar `(value: number) => number` applied after aggregation — `show/` uses it to turn accumulated minutes into hours. It is deliberately scalar: the shell owns table traversal and the null-vs-zero rule, so callers cannot couple to the pivot's internal shape.

### Sunburst — `common/Sunburst.tsx`

Renders an arbitrary-depth hierarchy from a flat list. `generateSunburstData` (in `common/sunburstData.ts`) builds path-style ids (`"-Nintendo-Switch-Zelda"`) and accumulates values into a `Map`, which makes grouping order fully dynamic: the caller passes `groups: K[]`, and `SunBurstControls` renders one select box per level so users re-nest the hierarchy at runtime. Domain meaning enters through four callbacks — `keyToVal`, `getCount`, `getColor`, `getLeafName`.

Depth follows the data: the leaf ring is `groups.length + 1`, so adding or removing a select box in a domain file changes the rings without touching `common/`. The Highcharts `render` callback that dims that ring lives at module scope (`dimLeafRing`) because Highcharts binds the chart to `this`, and the React Compiler cannot compile a function containing `this` — inlining it would silently opt the whole component out of memoization (§7).

### Timeline — `common/Timeline.tsx`

Hand-rolled SVG, not Highcharts, because the requirement was a Gantt-like packed timeline with rich hover cards. Two algorithms:

- **Greedy interval packing** (`packRows`, in `common/timelineLayout.ts`): sort by start date, place each item in the first row whose last item has already ended. Items are linked to their row neighbours (`previousDate` / `nextDate`) so the layout step knows how much empty space surrounds each bar.
- **Measured text placement** (`useTextPlacement`): a `useLayoutEffect` reads real DOM geometry and decides per item whether its label fits inside the bar (centre), or should spill left or right into the gap, tracking per-row whether the right-hand gap is already claimed. Labels live in a `<foreignObject>` spanning the whole inter-item gap so they can overflow the bar without being clipped.

The chart is fixed at `400vw` inside a scroll container, and the month/quarter/year axis is rendered separately beneath it.

A third piece is chrome rather than algorithm. `buildTicks` walks the month range once in `TimeLineChart`, and the resulting array feeds both the axis and `TimelineBackground`, which paints alternating year bands and year/quarter gridlines behind the bars. Sharing one array is the point: on a 22-row chart the axis is several hundred pixels below the top row, so a gridline that disagreed with its own label by even a pixel would misread every bar above it. The background is the first child of the `svg` because SVG paints in document order and has no `z-index`, and it is `pointer-events: none` so full-height rects do not become the topmost hit target across the whole chart.

Two things in that layer are load-bearing and easy to undo by accident. The label `Box` sets `lineHeight` to the bar height because it is `position: fixed` with no `top` — it lands at the top of its row and is centred only by its own line box, so any change to bar height without the matching line height silently pushes every label off-centre. And the hover step on a bar is deliberately instant: a CSS transition there is created but its clock never advances, because the tooltip opening re-renders the row and restarts it every frame, leaving the bar pinned at its start value. Both `transform` and `filter` behave that way.

### Card strip — `common/timelineStripData.ts`

The proportional bar on an expanded card: every season of a show, every game in a franchise, against a fixed epoch–today scale. `buildStrip` returns each span as a percentage offset and width alongside the caller's own fields, so a domain never has to key its records back out of the result.

Bands are positioned rather than chained. Walking gaps and bars in sequence turns an overlap into a negative gap, which drifts every later bar along the strip, and lets a minimum width push the total past 100% so flex shrink quietly distorts all of them — and a franchise produces overlaps routinely.

Spans that do overlap take separate lanes, because a band drawn over another hides it completely and takes the pointer with it, leaving no way to reach the buried one. Only a genuine overlap opens a lane: a span abutting the one before it — a season handed over to the next, a game to its sequel — stays in the lane and is tiled clear of it instead, because a lane costs every band in the strip a share of its height. Both rules are date-based and shared with the full timeline through `assignRows` in `common/timelineLayout.ts`, so the two charts cannot come to disagree about what counts as an overlap. The year gridlines come from that module's `buildTicks` for the same reason.

The renderer is `TimelineCard` in `common/Card.tsx`, which takes bands and ticks rather than nodes: the shell owns the whole coordinate space, so a caller reads `startPercent` and `widthPercent` and never asks how they were arrived at. Orientation lives entirely there — the data is percentages and knows nothing about which axis it will be drawn on.

### Stats and cards

`common/Stats.tsx` exports three composable pieces — `StatCard` (a row of labelled figures), `StatList` (a scrollable strip of media cards with a fullscreen dialog), and `TotalStack` (a proportional segmented bar with labels). It builds the bar from `Segment`, which lives in `common/Card.tsx` alongside the other proportional-bar primitives. Domain `Stats.tsx` files assemble these into a grid; they hold the arithmetic, the shells hold the layout.

`StatList` is itself assembled from two smaller shells that the same file exports, because a domain needed each of them on its own:

- **`ExpandableCard`** owns "a card that can also present itself fullscreen". It calls its `renderContent` twice — inline and for the dialog — and hands it the expand control to place in whatever header it builds. The dialog body is mounted only while open, so a strip of cards is not built a second time behind a closed dialog, and an internal `dialogMounted` lags `dialogOpen` so the body survives the exit transition.
- **`StatsListGrid`** owns the capped strip of media cards. The caps are `COLLAPSED_CARDS` and `EXPANDED_CARDS` (6 and 18), exported from the same module and applied _here_ rather than by callers — a caller that pre-sliced its own list would make raising either constant a no-op for that list.

Each has a caller of its own beyond `StatList`: `Finished` is built on `ExpandableCard` but keeps its own item grid, because it renders bordered full-width cards rather than media cards; and `vg/`'s Most Played reaches for `StatsListGrid` directly to fill the dialog it opens when drilling into a category.

The one piece of shared arithmetic is `assignPercents` in `utils/mathUtils.ts`: it floors each slice at 0.5% so tiny categories stay visible, then absorbs the resulting shortfall into the first entry so the bar always fills exactly. `TotalStack` and `vg/`'s `TopList` both use it. `total` is a parameter rather than derived, because those two callers scope it differently — one over all data, one over just the rows on screen.

`common/Card.tsx` provides `CardMediaImage` plus the `TypedCardMediaImage<T>` contract that every domain implements (`show/`, `vg/`, `movie/`). This is the adapter type that lets generic components — `Finished`, `StatList`, timeline tooltips — render domain-specific artwork and detail panels without knowing the model. Two of its props are shaped by cost rather than convenience:

- `detailComponent` is a thunk (`() => ReactNode`), not a node. `Finished` renders one card per item with no cap, and the dialog body is ~15 elements that are only ever mounted for the one card the user opens. `TimelineData.tooltip` is a thunk for the same reason and is the other place the convention applies: the timeline positions every row it is given, but only the hovered one needs a card, and a node would be built up front and then held for the life of the layout (§7, object lifetimes).
- `extractColour` is an explicit opt-in. Deriving a card's theme from its artwork costs a canvas read per image, so it is requested rather than inferred from the presence of some other prop.

### Colour

`utils/colourUtils.ts` extracts a dominant colour from each banner image with `fast-average-color`, ignoring near-white and near-black. If the result's ITU-R BT.709 luma falls outside 30–230 it retries with the `simple` algorithm, avoiding unreadable extremes. Results are memoised by image src. Cards then set text colour via MUI's `getContrastText`, so a card's palette derives entirely from its artwork.

Fixed colours are the other half of the system: `types.ts` in each domain maps platforms, genres, franchises and ratings to brand-accurate hex values, and `utils/types.ts` holds the cross-domain `statusToColour`. All of them return the branded `Colour` type.

`artworkPalette` in `common/Card.tsx` is what every surface carrying a sampled colour reads: a thumbnail's footer strip, a timeline hover card's panel, and the expanded card's ground, tiles and strip. One recipe rather than several treatments that happen to rhyme.

The ground is the sample exactly, because that is what ties a surface to the artwork beside it. Extraction holds anything between luma 30 and 230, so which of black and white can be read on it changes from card to card — the type is therefore derived from the ground with `getContrastText` rather than fixed, and turns over with it. The remaining tones are that same contrast colour made transparent: over a coloured ground it composites to a tint of the ground's own hue, which is what a secondary tone wants to be, and it needs no rule for which direction to mix in. That covers the muted tone for dates and labels, the rules and empty tracks, the wash that lifts a tile, and the three-pixel seam every surface draws where it meets its artwork.

The palette is total: with no sampled colour it fills the same shape from the theme. Extraction arrives seconds after the page and sometimes not until a reload, so the colourless state is the one every card paints first — leaving it outside the recipe is what would let the two halves drift apart, and it means no surface carries a branch asking whether there is a palette to read.

`CardMediaImage` publishes its accent on a context, and every surface inside it — panel, strip, detail tile, stat tile — derives the palette from that. The card is the only thing that knows its own ground, and the alternative is naming it at each of the two dozen `DetailCard`s the three domains build, plus a second mechanism for the surfaces that are not tiles.

## 7. Cross-cutting design decisions

### `PlainDate` instead of `Date`

`common/date.ts` defines an abstract `PlainDate` with three concrete subclasses — `Year`, `YearMonth`, `YearMonthDay`. This exists because the source data is calendar-precision and sometimes _only_ a year (an old game logged as `2007`), which `Date` cannot represent without lying about a day and a timezone.

Design properties worth knowing:

- **Interning.** Private constructors plus a static cache mean identical dates are reference-equal, so a `Map<YearMonth, number>` keyed by date works — which `Barchart`'s pivot relies on.
- **String-comparable.** `valueOf`/`toString` return the zero-padded ISO-ish form, so `<`, `>` and `sortByKey` work lexicographically on date objects with no accessor calls.
- **Serialisation symmetry.** `toJSON` emits the same string that `PlainDate.from()` parses, which is what makes the localStorage round-trip in §4 possible.
- **Dispatch by length.** `from()` returns `YearMonthDay` for a 10-character string and `Year` for a 4-character one, and throws otherwise — so a partial `"2024-05"` is a loud failure, not a silent one.

`firstDay()` / `lastDay()` give the range a value denotes — a whole year for `Year`, a single day for `YearMonthDay` — so a consumer states which end of an imprecise date it wants instead of picking one by reaching for a subclass.

`daysTo` deliberately returns `undefined` when either side is year-only, which is how duration-based features degrade rather than fabricate precision. Where a chart cannot degrade — half the games carry a bare year, and a strip has to put them somewhere — the estimate is made once, explicitly, and labelled: `vg/cardData.ts` shares each year out between the games naming it in release order, floored by the fact that a game cannot be played before it was released, and marks the spans `precise: false` so they are drawn as estimates rather than dates.

### Prototype augmentation

`Array.prototype.sum` / `sortByKey` (`utils/arrayUtils.ts`) and `Map.prototype.setIfAbsent` (`utils/mapUtils.ts`) are declared on the global interfaces and installed behind existence checks. `sortByKey` is non-mutating (`toSorted`). This keeps aggregation code short at the cost of a global-namespace change — a real trade, made once, and confined to two files. `mapUtils` is imported purely for its side effect in `main.tsx`.

### Branded types

`Distinct<T, Name>` produces nominal types over primitives. `Colour` (a branded string) prevents arbitrary strings reaching colour props, and `YearNumber` distinguishes a year from any other number. `KeysMatching<T, V>` restricts grouping and filter keys to fields of the right value type, which is what makes the generic `FilterCategory` and select boxes type-safe across domains.

### The React Compiler owns memoization

**Do not hand-write `useMemo` or `useCallback` in this codebase.** The [React Compiler](https://react.dev/learn/react-compiler) is enabled in `vite.config.ts` and auto-memoizes render-phase work. Hand-placed memos are redundant here, and they rot — a new dependency gets added and the array does not.

Setup is the plugin's documented path: `@vitejs/plugin-react` exports `reactCompilerPreset`, applied through `@rolldown/plugin-babel`. `react@19` already ships `react/compiler-runtime`, so only dev dependencies were added. `eslint-plugin-react-hooks@7`'s `recommended` config _is_ the compiler rule set, so `npm run lint` is the first line of defence against writing something the compiler cannot handle.

**The compiler silently skips functions it cannot prove safe**, which makes bailouts the thing to watch. Two constructs in particular opt a function out, and both have bitten this codebase:

- **`this`** anywhere in the function. Highcharts binds the chart to `this` in its event callbacks, so those must live at module scope (see `dimLeafRing` in §6) or they take the whole component down with them.
- **`??=`**, which the compiler cannot yet lower. Write `x = x ?? y` instead.

At the time of writing 83 functions compile and 10 bail, all of them on one compiler-internal limit: `BuildHIR::lowerAssignment` cannot lower a destructured prop that carries a default value, so `({ landscape = false })` takes its whole component out. That covers `common/Card.tsx`, `common/Stats.tsx`, `common/Finished.tsx` and `vg/Stats.tsx`. A `MethodCall` bailout, the other kind seen here, does respond to moving the offending computation into a plain module. To re-check after a change, temporarily pass a `logger` to `reactCompilerPreset` — see [AGENTS.md](./AGENTS.md) for the snippet.

The compiler costs about 4% of bundle size (~15KB gzipped) in injected cache slots. That is a deliberate trade, and `npm run analyze` exists to keep it honest.

### What the compiler does not do

It removes _repeated_ render work. It does not make eager work lazy, fix object lifetimes, or hoist anything out of a module-scope function. Those remain manual, and the codebase does them explicitly:

- **Concurrent rendering.** `useDeferredValue(data, [])` in every `Graphs` module keeps filter interactions responsive while charts re-render at lower priority; `Finished` dims itself (`opacity: 0.5`) while its deferred value lags, making the trade visible rather than confusing. `lazy()` + `<Suspense>` around every `Graphs` module (with a `webpackPrefetch` hint) keeps chart libraries out of the initial bundle.
- **Lazy construction.** `Card`'s `detailComponent` thunk and `TimelineData`'s `tooltip` thunk (§6), plus `ExpandableCard` mounting its dialog body only while open.
- **Object lifetimes.** `Timeline`'s `useTextPlacement` keys a ref map by row objects that are rebuilt whenever data changes; entries are deleted once all three refs detach, or dead rows would retain their tooltip trees — and through them the domain records.
- **Module-scope hoisting.** `Google.tsx` caches themes per tab and reads MUI's default palette once; `Sunburst` hoists an `Intl.Collator` rather than calling `localeCompare` across thousands of comparisons. The compiler's per-component cache is a fixed slot array, so it would not survive A → B → A navigation the way the theme `Map` does.

Bundle size is treated as a first-class concern — `analyze.html` / `analyze.json` are committed as a baseline.

### Filter state

The distinctive part is that filter state carries a composed `filter` predicate as a _field_, rebuilt inside the reducer whenever an input changes. Components then call `data.filter(state.filter)` without knowing which criteria are active, and adding a criterion means adding one predicate to the `filters()` builder.

The generic half lives in `common/filterReducer.ts`. `createFilterReducer(initialValues, filters, nextMeasure)` returns a domain's `useFilterReducer`, and owns everything that is the same everywhere: the action union, the `useOutletContext` guest-mode wiring, rebuilding `filter` after each change, and the shared `yearPredicates` (an "up to" ceiling that disappears once it reaches the current year, or an exact-year match). Each domain supplies only what is genuinely its own — the initial values of its own fields, how to turn that state into a predicate, and how its measure toggles.

`vg/filterUtils.ts` demonstrates the full pattern — boolean toggles, multi-select categories derived from the data itself (`[...new Set(data.map(...))]`), a year cutoff, and a Games/Hours measure. `show/filterUtils.ts` is down to its measure pair and an anime predicate; it still carries the year fields, which have no UI on that tab yet but let a year filter be added without reworking state.

### Guest mode

Long-pressing the AppBar (`utils/useLongPress.ts`, 300 ms) sets `guestMode`, which flows down through the router's outlet context into each domain's reducer and appends a predicate — hiding adult-themed games and anime. It is a presentation filter, not a security boundary: the underlying data is already loaded, and the mode is one-way until reload.

### Theming and routing

`Google.tsx` builds an MUI theme per tab from its `primaryColour` / `secondaryColour`, using CSS variables with a dark colour scheme, and emits a matching `theme-color` meta tag. Themes are cached in a `Map` keyed by tab id — building one walks both colour schemes, typography, shadows and the whole CSS-variable map, and a stable identity also stops the MUI tree re-evaluating `sx` on navigation. Each section therefore has its own identity while sharing one component library. Both `Google.tsx` and `NavBar.tsx` resolve the active tab through `useCurrentTab` in `tabs.ts`.

Routing uses `HashRouter` because the app is served from GitHub Pages, which cannot rewrite deep paths to `index.html`.

## 8. Extension points

**Adding a data source.** Add a `Tab` to `src/tabs.ts` (sheet id, A1 range, route id, component, colours), then add it to the exported `Tabs` array — the router and nav bar are both generated from that array. Create `src/<domain>/` with `types.ts`, a `<Domain>.tsx` entry that calls `useData` with a `jsonConverter`, and a lazy `Graphs.tsx`. Implement `CardMediaImage` against `TypedCardMediaImage<T>` to get `Finished` and `StatList` for free.

**Adding a visualisation.** If it is domain-agnostic, build it in `common/` taking data plus callbacks, and add a thin adapter per domain. If it needs domain knowledge, it belongs in the domain folder. The existing shells are the reference for how much to invert: `Sunburst` takes four callbacks, `Barchart` takes a data function and a scalar `postAggregate`. Keep the inversion at the level of _values and meaning_ — never hand a caller an internal data structure, and never let a shell branch on a domain-specific field.

**Adding a filter.** Extend the domain's `FilterState` (which extends `BaseFilterState`), push a predicate in that domain's `filters()`, and render a control in `Filter.tsx`. No changes to `common/filterReducer.ts` or to any chart.

## 9. Repository layout beyond `src/`

- **`extension/`** — a standalone Chrome MV3 extension (plain JS, loaded unpacked) that adds "Upload Show/Movie Image" context-menu items on images and hands the URL to a macOS Shortcut via a `shortcuts://` URL. This is how banner artwork gets into Google Cloud Storage. It is entirely outside the Vite build and shares no code with the app.
- **`.idx/`, `.vscode/`** — Google Project IDX and VS Code editor configuration.
- **`analyze.html` / `analyze.json`** — committed bundle-analysis output.

## 10. Known gaps

Recorded so they are not mistaken for design:

- **`holiday/` is a stub.** `HolidaysTab` is defined in `tabs.ts` but deliberately omitted from the exported `Tabs` array, so the route is unreachable. Its converter drops the dates its own `Holiday` type declares, and `Map.tsx` renders `data.toString()` as placeholder text. It also predates `useData` and hand-rolls its own module-level cache.
- **`movie/` is early.** Its `Graphs.tsx` renders only the `Finished` grid — no stats, timeline, barchart, sunburst or filters yet, and `movie/types.ts` has no colour mappings. `Movie` carries `rating`, `score` and `director` that nothing currently displays.
- **No DOM or component tests.** `tests/` covers pure logic — converters, filters, the reducer, the chart data transforms and the cache round trip — and deliberately stops there; AGENTS.md explains the trade. Nothing verifies that a chart renders, and the show converter's date ordering is still only a `console.assert`, which does not alter control flow.
- **`.eslintrc.cjs` is dead.** ESLint 9 uses the flat `eslint.config.js`; the legacy file remains in the tree and is not applied. The flat config is also the weaker of the two — it drops the type-checked and React-specific rule sets the old file enabled.
- **Cache keys are unversioned**, so domain model changes can meet stale `localStorage` objects (§4).
- **Ten React Compiler bailouts** remain (§7), all on the same limit: a destructured prop with a default value opts its component out. Four are in `common/Card.tsx`, which every media card in the app renders, so this is the one bailout that is on a hot path.
- **`PlainDate.valueOf` returns a string**, so every date comparison goes through `toString()` and allocates. It is correct and the ordering is deliberate (§7), but the hot path — the timeline's greedy packing loop — does tens of thousands of comparisons per layout. A numeric sort key computed once per interned instance would preserve ordering exactly, including across mixed `Year`/`YearMonthDay`. Deliberately not done: it touches the most load-bearing class in the codebase for a win nobody has measured as necessary.
