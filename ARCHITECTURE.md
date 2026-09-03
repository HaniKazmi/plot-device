# Architecture

Plot Device is a client-only React SPA (~16,000 lines of TypeScript) that turns personal tracking spreadsheets into interactive dashboards. This document explains how the pieces fit together and why they are shaped the way they are. For working conventions and the verification loop, see [AGENTS.md](./AGENTS.md); for setup, see [README.md](./README.md).

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

There is no backend, no database, and no build-time data. Four Google Sheets are the system of record; the browser authenticates directly, fetches whole ranges, and does every parse, join, aggregation and render locally. Deployment is a static bundle pushed to GitHub Pages by `npm run deploy`.

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
  domain            │  vg/ · show/ · movie/ · books/ · omnibus/ │
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

The load-bearing rule is the boundary between the bottom two layers and the domain layer above them: **`common/` and `utils/` never import from `vg/`, `show/`, `movie/`, `books/` or `omnibus/`.** Generic components receive behaviour as props and callbacks; domain folders supply the meaning. Everything reusable in this codebase lives on that seam.

The rule holds with no exceptions, and the direction matters. Where the shared layer needs a domain vocabulary, it declares its own and lets each domain's type stay assignable to it — `utils/types.ts` owns a `ColourableStatus` union that both `show/types.ts` and `vg/types.ts` satisfy, rather than importing their `Status` unions. Inverting that would create an import cycle, since both domains import `statusToColour` back out.

Every section on the tab but the vitals band is rendered only where it has something to say, and
the rail's chips are built from the same tests. The band itself always stands, because a total of
zero is a true answer to how much — where an empty pivot is not a picture of nothing but a picture
of whatever the plotting library invents from it, and a proportional bar over one group states
only what the reader just chose.

`omnibus/` sits in the domain layer beside the other four, not above it: it imports `vg/`, `show/`, `movie/` and `books/` and composes their output, which is exactly what a domain folder is for. It reads no sheet of its own — see §3 — so it is the one domain with no converter, and everything else about it (filters, adapters, a lazy `Graphs.tsx`) follows the same shape as the other four. The rule this layer exists to protect is unchanged: nothing in `common/` or `utils/` imports `omnibus/`, and `omnibus/` reaching upward into four domains at once is what the layer is built to allow, not an exception to it.

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
   │                       → VideoGame[] | Show[] | Movie[] | Book[]
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
- **`show/`** reduces a _flat_ sheet into a _nested_ one. Rows with a non-empty `Show` column open a new show; subsequent rows are seasons belonging to it. Afterwards it rolls season totals up into the parent (`startDate`, `endDate`, episode and minute sums) and logs a date-ordering mismatch with `console.error`, which does not alter control flow. Seasons keep a `show` back-reference, which makes the object graph cyclic — see §4.
- **`movie/`** parses a blank Runtime to `0` and a blank Score to `undefined` — `sum` accumulates with `+`, so a `NaN` in the minutes column would blank every hours total taken over it, while a score is honestly absent rather than zero.

- **`books/`** holds every date to a full one through `readFullDate`, since the sheet records reads to the day, and rejects a `Status` or a `Format` outside its two small vocabularies the way the other converters reject a certificate — `statusToColour` answers `undefined` off its union and the status band would drop the segment without a word. Pages and hours are rejected when not numeric rather than defaulted, because both are measures: a `NaN` blanks every total and a `0` is a lie in a sum. A blank `Score` is `undefined` as on the Movies sheet; a blank `Franchise` becomes the book's own name, the convention the Games and Movies sheets write for a standalone work, so every franchise shell treats a standalone book exactly as it treats a standalone film; `Days Reading` is derived from the date pair, counting both ends as Games does, rather than read.

Both `show/` and `movie/` split a comma-separated `Genres` cell into the genres beyond the primary one, and reject an age rating outside `AgeRating` through `sheetError` — a bad certificate names its row here rather than throwing later from inside a chart's colour lookup.

All four read the primary genre through `readGenre` and reject an empty one the same way. The vocabulary is open-ended, so the only thing checkable is that a value is there — and that is worth checking precisely because the ramp answers `NEUTRAL_FILL` off its table: a blank reaching a chart is indistinguishable from a genre nobody has coloured yet. Testing the cell against `""` is not enough on its own, because the API ends a row at its last filled cell, so a half-entered row carries no `Genre` key at all. Shows asks only of a row that opens a show, since a season's genre is the show's.

Omnibus runs no pipeline of its own. Each domain's entry component — `vg/vg.tsx`, `show/Show.tsx`, `movie/Movie.tsx`, `books/Books.tsx` — calls `useData` with a config object (`vgDataConfig`, `showDataConfig`, `movieDataConfig`, `bookDataConfig`) exported from the file that already owns the converter, version and — for Shows — the replacer/reviver pair; `omnibus/Omnibus.tsx` imports the same four configs and calls `useData` with each of them again. Both callers therefore go through one converter and one cache key per domain, so the version a returning visitor's cache was written under can never drift between a tab and Omnibus reading the same rows. `omnibus/adapter.ts` is the fifth stage the four domains' output feeds into: `toOmniItems` flattens `Show[]` at the season rather than the show — a season is the unit that was actually watched, and the parent show's name, genre, franchise and certificate travel onto each of its seasons' `OmniItem`s. A book carries no certificate, so `OmniItem.rating` is optional and every surface grouping on it drops books rather than shelving them under a blank.

## 4. Caching and hydration

`common/useData.ts` implements a two-tier cache:

| Tier                         | Lifetime      | Purpose                                                              |
| ---------------------------- | ------------- | -------------------------------------------------------------------- |
| `CACHE` (module-level `Map`) | Page session  | Survives route changes and component unmounts; suppresses refetching |
| `localStorage`               | Across visits | Lets the dashboard paint before authentication completes             |

On mount the hook returns cached data synchronously from its `useState` initialiser, so charts render immediately from the previous visit's data; `dataLoaded` itself starts `true` when the module-level `CACHE` already holds the key, since every entry in that map was written by a fetch this session already made. Once `apiReady` becomes true it fetches — sharing one in-flight promise per `storageKey`, so a second mount of the same domain (a home tab and the Omnibus both mount Shows) subscribes to the fetch already running instead of issuing a second `values.get` — then sets the data, flips `dataLoaded`, clears any earlier `error`, and writes the cache once per fetch regardless of how many callers are reading it. `DataLoadedSnackbar` shows its "Refresh Complete" toast only for a `false → true` turn it watches happen after mount, not for `dataLoaded` arriving already `true`: a tab served entirely from `CACHE` shows nothing, and the Omnibus shows once its last pending domain lands. The caller has to keep the snackbar mounted at a stable position across that turn, or the transition is unobservable.

Two subtleties live in the serialisation boundary, and both are easy to break:

1. **The cycle.** `Season.show` points back at its parent `Show`, so `JSON.stringify` would recurse forever. `useData` takes an optional `replacer` and an optional `reviver`, and `show/converter.ts` supplies both as a matched pair (`dropSeasonParents` / `reviveSeasonParents`): one drops the `show` key on write, the other re-attaches the back-reference on read. Neither rule lives in the hook — a domain concern would otherwise silently eat any future field named `show` in another domain. Both are module-scope constants so the fetch effect can depend on them without re-firing. Any future model with parent pointers needs the same pair.
2. **Date revival.** The `JSON.parse` reviver converts **any key whose name contains `"Date"`** into a `PlainDate`. It is a deliberate convention: a non-date field called e.g. `updateDate` whose value happens to be a 4- or 10-character string is still silently miscast into a `Year` or `YearMonthDay`. Any other length, or `null`, makes `PlainDate.from` throw instead — `parseCachedItems` catches that inside the `useState` initialiser and returns `undefined`, so the whole cached copy for that domain is dropped and refetched rather than throwing mid-render.

Cache keys are versioned per domain — `dataCacheKey(domain, version)` yields `vg-data-cache-v2`, `show-data-cache-v3`, `movie-data-cache-v3`, `book-data-cache-v1` — and `dropSupersededVersions` clears a domain's earlier keys on first load. A model-shape change therefore means bumping the version in that domain's own `converter.ts`, which is where the config holding it lives; forgetting the bump leaves returning visitors' cached objects missing the new field, silently, until their next authorised fetch.

## 5. Authentication

`contexts/GoogleAuthContext.tsx` owns the whole auth lifecycle:

- **Script loading.** The GIS (`accounts.google.com/gsi/client`) and gapi (`apis.google.com/js/api.js`) scripts are injected at runtime by an internal `useScript` hook, which is idempotent — it reuses an existing tag and checks a readiness predicate before attaching a load listener. `App.tsx` calls React's `preload()` for both so the network fetch starts during the initial render.
- **Token storage.** The OAuth token is wrapped with an absolute `expiry` and stored in `sessionStorage`. `getValidToken` evicts it once expired, so a stale token never reaches gapi.
- **Readiness.** `apiReady = tokenSet && apiReadyToFetch` — a valid token _and_ an initialised gapi client. Consumers wait on this single flag rather than tracking two async loads.
- **Failure handling.** A rejected `values.get` clears `tokenSet`, which flips the NavBar back to an "Authorise" button. Expiry mid-session therefore self-heals into a re-prompt rather than an error state. A refused authorisation — a `TokenResponse` carrying `error` rather than `access_token` — is caught at the source instead: `isGrant` in `contexts/token.ts` rejects it before the callback stores anything, so a declined consent screen simply leaves `tokenSet` `false` rather than seeding a token that would fail the first fetch.

The requested scope is `spreadsheets.readonly`. The application has no write path by design.

`authorise` and `revoke` are exposed as `undefined` when unavailable, so `NavBar` renders its three states (Authorising / Authorise / Revoke) by presence-checking rather than by reading separate booleans.

## 6. Presentation subsystems

### Highcharts wrapper

`src/highcharts.ts` is the single import point for charting. It applies global defaults once (no credits, no titles, accessibility off) and re-exports the declarative components. Charts are composed as JSX (`<Chart><XAxis/><Series/></Chart>`) rather than configured as one options blob.

### Barchart — `common/Barchart.tsx`

The most involved shell. It accepts `data` as a _function of_ `cumulative` and returns flat `{ name, date, colour, value }` records; the component owns everything after that:

1. `groupDate()` (in `common/barchartData.ts`, alongside the transforms below) pivots the flat records into a dense `BarchartTable` (`group × date` matrix). Dates are densified by walking `PlainDate.iterateToDate`, so gaps become real columns instead of being skipped. Series are sorted by total, and leading cells before a series' first data point are set to `null` so lines start where the data does rather than at zero.
2. `convertToCumulative()`, `convertToShare()` and `convertToRanking()` are pure transforms over that matrix — cumulative area, per-column composition and bump-chart ranking are views of the same pivot, not separate queries. One `View` control (`Totals` · `Share` · `Cumulative` · `Rank`) owns all four. A chart-type toggle beside a separate cumulative switch would offer the same four as a pair of independent choices, which they are not: a cumulative bar and a ranked total both plot the same pivot into the same shape twice. `Share` divides each cell by its own column's total — a zero column would divide by zero, so a column with nothing in it yields zero cells rather than `NaN` reaching a series — and is always taken over the raw measure, never through `postAggregate`: two callers pass a flooring minutes-to-hours conversion, and the share of floored values is not the share of the values behind them. `Rank` ranks the same per-column measure `Totals` plots, and keeps that measure as its tooltip figure, so the axis can plot position while the hover card still states the underlying number.
3. Clicking a column isolates that series (and clicking again restores all), implemented through Highcharts' plot-options event rather than React state.

The legend is reversed and the `Rank` view is not given the full height. `groupDate` sorts groups ascending so that Highcharts' `reversedStacks` — on by default — puts the biggest at the foot of the stack, where a stack is read from; the legend follows series order unless told otherwise, and unreversed it opens on the smallest, against the vitals band, the genre rows and the gallery's shelves, which all lead with the biggest. Reversing the legend alone leaves the stack itself untouched. Height is the resolution of a magnitude, so the three views that plot one keep the full `80vh`; a bump chart needs a lane per series and nothing else, and three media over eight tenths of a viewport puts two hundred pixels between adjacent ranks.

Callers choose the measure (episodes vs hours, games vs hours) and pass `postAggregate`, a scalar `(value: number) => number` applied after aggregation — `show/` uses it to turn accumulated minutes into hours. It is deliberately scalar: the shell owns table traversal and the null-vs-zero rule, so callers cannot couple to the pivot's internal shape.

### Sunburst — `common/Sunburst.tsx`

Renders an arbitrary-depth hierarchy from a flat list. `generateSunburstData` (in `common/sunburstData.ts`) builds path-style ids (`"-Nintendo-Switch-Zelda"`) and accumulates values into a `Map`, which makes grouping order fully dynamic: the caller passes `groups: K[]`, and `SunBurstControls` renders one select box per level so users re-nest the hierarchy at runtime. Domain meaning enters through four callbacks — `keyToVal`, `getCount`, `getColor`, `getLeafName`.

The chart is keyed on the grouping and on a rebuild counter, so a re-nest replaces the chart rather than updating it in place: Highcharts matches incoming nodes to existing points by position, and rewriting every id below the first ring reassigns the previous tree's angles, drawing a partial fan with gaps. The series also states its `rootId` from the data each render (`sunburstRoot` in `common/sunburstData.ts`), and a layout effect clears a drilled id the new data no longer holds and bumps the counter, so a drill into a subtree that a re-nest or filter removes falls back to the top instead of translating from a node that is not there. Depth follows the data: the leaf ring is `groups.length + 1`, so adding or removing a select box in a domain file changes the rings without touching `common/`. The Highcharts `render` callback that dims that ring lives at module scope (`dimLeafRing`) because Highcharts binds the chart to `this`, and the React Compiler cannot compile a function containing `this` — inlining it would silently opt the whole component out of memoization (§7).

The series states its `rootId` from the data itself on every render: `sunburstRoot` (`common/sunburstData.ts`) looks the drilled-into id up in the freshly generated nodes and answers the top id when it is not there, so a re-nest or a filter that removes the node a reader had drilled into falls back to the top rather than asking Highcharts to translate from a root id no longer in the tree.

### Timeline — `common/Timeline.tsx`

Hand-rolled SVG, not Highcharts, because the requirement was a Gantt-like packed timeline with rich hover cards. Two algorithms:

- **Greedy interval packing** (`packRows`, in `common/timelineLayout.ts`): sort by start date, place each item in the first row whose last item has already ended. Items are linked to their row neighbours (`previousDate` / `nextDate`) so the layout step knows how much empty space surrounds each bar.
- **Measured text placement** (`useTextPlacement`): a `useLayoutEffect` reads real DOM geometry and decides per item whether its label fits inside the bar (centre), or should spill left or right into the gap, tracking per-row whether the right-hand gap is already claimed. Labels live in a `<foreignObject>` spanning the whole inter-item gap so they can overflow the bar without being clipped. It re-measures on a window resize — width only, since every placement number here is a pixel off a grid whose width alone moves it — and drops to the empty layout first, so a label is never measured while it is still wearing a placement sized for the previous width.

The chart is fixed at `400vw` inside a scroll container, and the month/quarter/year axis is rendered separately beneath it.

A third piece is chrome rather than algorithm. `buildTicks` walks the month range once in `TimeLineChart`, and the resulting array feeds both the axis and `TimelineBackground`, which paints alternating year bands and year/quarter gridlines behind the bars. Sharing one array is the point: on a 22-row chart the axis is several hundred pixels below the top row, so a gridline that disagreed with its own label by even a pixel would misread every bar above it. The background is the first child of the `svg` because SVG paints in document order and has no `z-index`, and it is `pointer-events: none` so full-height rects do not become the topmost hit target across the whole chart.

Navigation is the fourth piece, and it reads from the same tick array. `yearMarkers` folds the ticks down to one entry per calendar year — the opening one pinned to the left edge, because a chart rarely starts in January and the year that opens it owns the grid from there. That one array is walked once in `TimeLineChart` and handed to both consumers: `TimelineBackground` shades alternate years from it, and a row of year chips beneath the axis scrolls by it.

The chips are a scale over the scroll range, not a set of anchors on the grid, and `percentAtScroll` / `scrollAtPercent` own both directions of that mapping. The distinction is forced by the chart being four viewports wide: `scrollLeft` stops at `scrollWidth - clientWidth`, three quarters of the grid, so reading a marker's own percentage as a fraction of `scrollWidth` leaves the last quarter of the years unreachable — every chip in it clamps to the same edge and the highlight saturates on whichever year that edge falls in. Mapping the whole marker span linearly onto the reachable range instead makes the two directions inverses: clicking a chip lights that chip, and dragging moves the highlight through every year in turn. What it costs is exact alignment — the first chip still puts its year line on the left edge and the last still reaches the end of the chart, but the years between land progressively further into the viewport, so a lit chip names a year on screen rather than the one at the left edge.

The highlight is held as the year last scrolled to and read back through the current markers, so a filter interaction — which leaves the reader's scroll position alone — cannot leave a chip naming a year the rebuilt chart no longer has. With nothing scrolled yet that reads as the latest year, which is the end `useOpenAtLatest` opens the chart at. That effect is keyed on whether there is data at all, which is the only thing it is for: the chart renders nothing until it has some, and anything finer re-runs on a filter change and drags the chart back to the right edge out from under the reader.

What React holds is a year and nothing else: the `onScroll` handler reads the offset as the year it lands in and sets that, so the hundreds of events one drag produces settle to one state change per year crossed, and a set to the value already held costs no render at all. Holding the raw offset instead would re-render the whole chart every frame of every scroll, which is what makes an edge treatment computed per frame — a fade whose opacity follows the position — the expensive way to say the same thing. The affordance that does say it is static CSS: the scroll container styles its own scrollbar (`scrollbar-width`/`scrollbar-color` for Firefox, `::-webkit-scrollbar` elsewhere, both from the same two theme tokens), which is what opts macOS out of overlay scrollbars that hide themselves the moment scrolling stops. A thumb a quarter of the track long then states both that there is more and how much, at no runtime cost. The handler is a JSX prop rather than a listener in an effect because `markers` is rebuilt each render and an effect would have to reattach as often.

Two things in that layer are load-bearing and easy to undo by accident. The label `Box` sets `lineHeight` to the bar height because it is `position: fixed` with no `top` — it lands at the top of its row and is centred only by its own line box, so any change to bar height without the matching line height silently pushes every label off-centre. And the hover step on a bar is deliberately instant: a CSS transition there is created but its clock never advances, because the tooltip opening re-renders the row and restarts it every frame, leaving the bar pinned at its start value. Both `transform` and `filter` behave that way.

### Event ribbon — `common/EventRibbon.tsx`

The Movies watch timeline. A film is a point in time, and the packed timeline cannot hold points:
`assignRows` frees a row the moment a span ends, and a point ends the moment it starts, so a whole
library of them packs into one row of a chart four viewports wide. The ribbon fixes the rows
instead — one track per calendar year on a shared 1 January – 31 December scale, each film a mark
at its watch date — so density within a year and seasonality across years read at a glance. The
marks are `buildStrip`'s point-event handling doing the work: a single day floors to the minimum
band width, and films watched within days of each other tile clear of one another inside the lane
rather than stacking. One tick array feeds every row's gridlines and the single axis beneath the
stack, the same one-array rule the full timeline follows. Hover cards arrive through
`common/LazyTooltip`, so positioning hundreds of marks builds only the handful of cards actually
hovered.

### Omnibus — `omnibus/`

The composing domain draws no chart of its own kind; every surface is a `common/` shell fed the
union (`OmniItem[]`) instead of one medium's rows, so the page reuses the same visual vocabulary the
four tabs already speak rather than inventing a mixed-media one.

**The Now band** (`omnibus/Stats.tsx`) is what none of the four tabs can show on its own: what
each medium is currently on, side by side. `electNow` in `omnibus/adapter.ts` reuses each domain's
own election — `currentlyPlaying`, `heroSeason(currentlyWatching(...))`, `latestWatched`,
`currentlyReading` — so a card here can never disagree with the hero its home tab would show for
the same item. A medium with nothing in flight contributes no card rather than an empty one, and
the band itself is absent when none of the four has anything to say. Each card renders the domain's own `TypedCardMediaImage`, so
its artwork still opens that domain's expanded card — the composing layer supplies only the corner
chip that jumps to the home tab.

Every card in the band is one width — a poster's artwork at the row's height plus its text column,
434px — and each shape spends it differently: the poster's picture takes the full height and the
words a column beside it, while the banner's picture spans the card, so the width fixes its height
at 16:9 and the panel gets the 136 the row has left. Whether four cards fit on one row is a
question of the width the page gives the band, so that is measured (`common/useElementWidth.ts`)
and the four-way share solved from it (`omnibus/nowGeometry.ts`) rather than copied from the
theme's container numbers; the share has a floor, which only the widest container reaches, and
under it the four seat two and two. The words' height is not measured: deriving the banner's width
from however tall its words turn out needs a loop that settles, where pinning the width states the
panel's budget outright. What that budget costs is a panel that cannot
grow — the title clamps to one line, because the picture is what would have to give way instead,
and it would be letterboxed inside a card the row has already sized.

A cover card is a poster card whose picture is pinned on the row's height alone. No two book covers
share a ratio — they arrive from publishers at roughly 2:3 and vary by a few percent each — so a
card that held one to the poster's exact ratio would letterbox nearly every one of them. The cover
shape (`common/cardArrangement.ts`, `shapeIsExact`) declares 2:3 as a reservation and never a size:
the picture stands at its file's own width against the row's height, and the text column beside it
gives up or gains the few pixels one cover differs from another. That is the whole of what varies;
nothing is cropped or letterboxed, and every card in the row is still one width.

Fitting a kicker, a title, a subtitle and a figure into 136 is what `statSize="compact"` and the
band's halved panel inset are for, and both are spent on every card rather than on the banner
alone: the row is read across its figures, so a tile shrunk on one card and not the others would
trade the band's consistency for one card's fit. `inlineKicker` is the banner's alone — at 402px its
date and platform take the two ends of one line, where the poster panels' 176px column would wrap
the same two to four lines and cost more than it saved. The two ends rather than a run of parts:
pushing them apart is what separates them, so no mark is needed between two things the width
already tells apart.

On a phone the band is a column, and there a poster seats its words beside it rather than beneath.
The arrangement rule (§6) decides by shape at every other width; here it decides by shape _and_
width, because a card that fills the screen is a card as tall as its own artwork — a full-bleed
poster stands 550px at 375px wide, and three of them put the band's last figure two screens below
its first. A banner keeps its words underneath at every width: beside a 16:9 picture at this height
there are nineteen pixels of column left.

**Mixed rows are one card size, the Now band's rule at strip scale.** A list lays its cards out
one of two ways (`CardLayout` in `common/Stats.tsx`): as a grid at stated column spans, or as a
sized row. Recently Finished and the gallery's drill-downs take the second, handing the shell a
`rowSizing` (`MIXED_CARD_SIZING` in `omnibus/cardData.ts`) in place of spans — the two are a union
rather than a pair of optional props, so a sized row is never handed spans it cannot read — and
every card in a row then stands at one size with the picture sized by its shape and the words
taking what it leaves: a poster or a cover fills the height and takes its own width beside a column
of whatever is left, a banner fills the width at 16:9 over a footer of stated height. The caller
states only what it knows — the minimum width, solved from a poster beside a column wide enough for
a date and a two-line title, and the picture's height at a width, the banner's — and the shell adds
what is its own: the band it draws over the picture, the one-line footer it draws under a banner
(`ROW_FOOTER_HEIGHT`, which travels to the card on its `rowSize` rather than being read there, so a
list drawing a taller footer states a taller one), and the border. The row is then measured
(`common/useElementWidth.ts`) and shared between as many of those as fit (`common/rowSizing.ts`),
so a whole number of cards fill it rather than leaving a strip of ground that grows to nearly a
card before one more fits, and neither shape is letterboxed. Measured rather than stated at
breakpoints because the dialog spans the viewport and no constant says how wide its row is. A grid gives every card one width and a row is then as tall as
its tallest card — a banner's footer under a picture the cell's width, a poster's words beside a
picture half that — so the shorter cards carry a strip of their own ground, and a poster card
seated beside a lazily loaded picture has no height at all until the file arrives. The medium is named in the same band the shelves draw, along the top of the whole card
(`CardMediaImageProps.mediaBand`), rather than in a chip over the artwork; on a card laid out as a
row the band takes a line of its own above the picture and its words, with no width of its own to
add to theirs. The home tabs' own strips
pass no row height and keep the grid, since a single medium's cards are all one shape.

**Recently Finished** (`omnibus/RecentlyFinished.tsx`) is the list each tab already keeps for
itself, asked once across all four: `recentlyFinished` in `omnibus/adapter.ts` keeps only items
with a `closeDate`, since an item still in progress is not finished and listing it says something
false — the same filter also leaves every entry with a date to sort by. The library wall
(`common/Finished`) is not reached from the union; see §10.

**By year** (`omnibus/Barchart.tsx`, `omnibus/barchartData.ts`) is the union on a time axis, split
by medium, genre or certificate. Medium is what the page opens on and the reason it exists — three
libraries share an axis because a game, a season and a film are comparable as media and little
else — but it is not the only vocabulary the tab teaches, and until the gallery's other groupings
reached the time axis the page could say what a genre was made of and never when it happened. The
split is also what makes the shell's four views worth having: Share and Rank divide a column
between its series, and three series is a bar in two pieces and a bump chart of three flat lines.
Franchise is not offered, because it answers with 115 series and a legend longer than the chart;
decade is not either, since a decade is derived from the year and each series would occupy one run
of columns with nothing crossing. A certificate splits on the age band (§6, Colour), and a genre
takes the ramp the genres band and the gallery's swatches already use, so a hue means one thing
across the page. A row whose split column is empty is dropped rather than opening a series with no
name, and the header counts the rows drawn rather than the rows handed in.

**The gallery** (`omnibus/Gallery.tsx`, `omnibus/galleryData.ts`) shelves the union by genre,
franchise, rating or decade, each shelf a `common/Filmstrip` (below) with a drill-down behind its
handle. Each picture names its medium in a band along its top rather than in a chip over it, in
that medium's own fill: a chip says which of the four a card is by covering the artwork it is
labelling, on every card, on six shelves at once. The band is the card's `mediaBand`
(`omnibus/MediumLabel.tsx`), the same one the drill-downs and Recently Finished draw, and a shelf
card carries no words beside or beneath its picture, so the shape rule arranges nothing and the
picture keeps the whole of the height the shelf gives it below the band. Every category but rating is a field all four media record — `groupByCategory` skips an empty value,
so a category one medium answered `""` to drops that medium off the wall with no error to say
so. Rating is the deliberate exception: nothing certifies a book, so books are absent from the
rating shelves and from the by-year chart's certificate split rather than shelved under a
certificate nobody issued, and both answer `""` for them on purpose. "Decade" reads as the decade
the reader _met_ the item, not the decade it was made: Shows carries no release date anywhere in
its model, so a release-decade category would be answerable by only three of the four media. The section is an `ExpandableCard`, so the six shelves the card holds are not
the whole answer: expanded, it draws as many shelves as keep its pictures inside the same budget a
drill-down dialog spends, which is twenty-five. Deriving that from the picture count rather than
picking a shelf count is what keeps the four categories comparable — grouping by franchise yields
115 shelves against genre's 12, so an uncapped expansion would mount over two thousand cards on one
category and a couple of hundred on the others.

Two orders are on offer, and one control drives both the shelves and the pictures on them: a
gallery whose shelves came newest first while every strip still led with a decade-old entry would
be answering two questions at once, so the shelf's fronting card is the strip's first picture
either way. The shelves are cut _after_ the sort, so the six on the card are the six biggest or
the six most recent rather than the recent among the biggest. Recency is a date and not the `year`
an item already carries: twelve genres over a library this size nearly all hold something from the
current year, which leaves almost every shelf tied and the control visibly inert. It is carried on
a `metDate` beside `year` rather than written over it in any case — `galleryGroups` re-derives a
shelf from the collapsed item and the decade category reads `year`, so a show whose seasons closed
in two decades would have both of its copies claim the later one and empty the earlier shelf. A
work's date is the last of the entries collapsed into it and not its representative's, since the
representative is the biggest entry rather than the last; an item with no close is dated now,
because an open item is the one being met.

**Genres by medium** (`omnibus/GenreBridge.tsx`, `omnibus/genreBridgeData.ts`) is the composition
question asked of genres instead of franchises: one proportional bar per genre, split by how its
hours divide between the four media. A genre held by one medium is drawn as a solid bar rather
than held back until a second arrives. Requiring the crossing puts a cliff in the section — a genre
accrues its whole weight invisibly and one entry logged elsewhere then admits all of it at full
size, Abstract being 136 hours of games that a single abstract film would introduce — and the bar
states the confinement, which is the fact the cliff was hiding. What is still dropped is a genre
whose every entry logged nothing, which has no bar to draw at all. A medium contributing no hours
to a genre gets no segment either, because
`assignPercents` floors every slice at half a percent to keep it visible, and a visible slice of
nothing is a claim the data does not make. The hover dim is one piece of state for the whole card
rather than one per row, which is what turns a stack of independent bars into a comparison read
down the column.

**Franchises over time** (`omnibus/crossingsData.ts`) draws each franchise the reader has met as a
strip: one lane per medium present, packed with `common/timelineStripData`'s
`buildStrip` exactly as a show's own season strip is, so the two charts cannot come to disagree
about what counts as an overlap. Reaching a second medium is not asked of a franchise — the same
cliff the genres band avoids, and one that hid the largest series on the page, thirty seasons of
Doctor Who standing behind the absence of a Doctor Who game. What the lanes say is which media hold
a franchise, a reading of the strip rather than a condition on drawing it, and a franchise one
medium holds is a single lane by the same arithmetic. Every strip is handed one tick array, built once by `Graphs`, so
the section states its years once beneath the stack — `TimelineCard` takes `axis={false}` and
`TimelineAxis` is exported for the purpose. A per-strip axis on a shared scale is not twelve axes
but one row of labels drawn twelve times, a quarter of the section's height restating a scale that
cannot vary.

The whole stack is then drawn three times its container's width inside one scroller. A quarter of a
century across one screen gives a year about fifty pixels, and Marvel puts fifty-one entries on it —
a dozen inside two years, at a minimum mark width of six. The marks are closer together than they
are wide, and the strip reads as a texture rather than as dates; at three times the width a year is
a hundred and fifty pixels and the same run separates into the entries it is made of. Three rather
than the full timeline's four, because that chart is one row of bars and this is a stack of twelve,
so every viewport of scroll is paid for twelve times over. One scroller for the stack rather than
one per strip is what keeps the shared scale true — separate scrollers would let a reader compare
two rows showing different decades. It opens at the most recent end, as the full timeline does:
the epoch is the earliest entry anywhere, and most franchises were met years after it, so the
opening screenful would otherwise be a third of the scale with almost nothing on it. The franchise
names are `position: sticky` inside the scroller, which needs `Card`'s own clipping opened — a
sticky element travels with the nearest scrolling ancestor, and a caption left inside a card that
does not scroll simply leaves with its track. A franchise groups on the raw franchise column, the same column
`movieFranchise`/`showFranchise` group on, which is what lets a series' founding entry keep naming
itself the way it already does on its own tab; `namesTheSameThing` instead drops a whole group where
_every_ entry in it repeats the franchise name, since that group has no series structure left to
draw a lane for. That is the one test a group has to pass, and it is what holds the section to
series rather than to the franchise column: the three sheets' 588 franchise values are 169 series by
it. A film is a point (`start === end`), which the shared strip floors to its minimum
band width the way the Movies ribbon already does. A bare-year game date draws its whole year rather
than the share `vg/cardData.ts` would estimate for a single game's own strip — a franchise lane
holds a handful of entries, not a library to divide a year between — and is marked `precise: false`
so the edges read as an estimate.

`common/useScrollEdges.ts` is what tells a reader those rows scroll. Two of them hide their
scrollbar — the section rail, where a bar under a row of chips costs as much height as the row, and
the gallery's shelves, where the strip reserves room for one the platform then declines to draw:
macOS Chrome's overlay scrollbars appear only while scrolling, and neither `scrollbar-width` nor
`::-webkit-scrollbar` opts out, leaving `offsetHeight - clientHeight` at zero. So a shelf of twenty
pictures shows six and the only thing saying so is that the sixth is cut off. The hook measures
which ends have content past them and `common/ScrollFade.tsx` paints them, as absolutely positioned
overlays in a wrapper around the scroller. It re-reads after every render rather than observing the
children it had at mount: a filter that replaces a shelf's twenty pictures leaves the strip itself
mounted, so an observer bound to that first set would watch nodes no longer in the row and never see
the ones that are. Two layout reads after a commit are cheaper than keeping that set in step, and a
boolean per edge means a read that finds nothing changed re-renders nothing.

Nothing on the scroller itself can do it. A background and an inset shadow are both painted before
its children, so a shadow at the edge tints the gaps between marks and leaves every mark crisp on
top of it — visible on an empty row and invisible on the dense one the fade exists for. A mask has
the opposite problem: it takes the element's own background with it, and the rail is pinned over the
page, so the content beneath would show through the gap. A pseudo-element inside the row is a flex
item that still takes the row's `gap`, enough to clip the first chip against the very edge the fade
was added to explain. A sibling after the scroller is painted over it and touches none of that.

The wrapper is therefore what a caller pins, paints and hands a ref to, and the row inside it is
only the part that moves — for a row. The library's jump rail builds its own column from the
exported `RailChip` rather than going through `ChipRail`: that shell is a row that scrolls, and
everything it does for one — the fades, the edge measuring, the wrapper a caller's `sx` lands on —
is for content running past its container, where the rail is mounted only when every chip fits at
full height. Each caller passes its own ground — the page's for the rail, the card's
for the strips — and where a caller pins something inside the scroller, that thing is lifted above
`FADE_Z`: the crossings' franchise names sit exactly where the leading fade does, and a name is not
part of the track running out of the card.

`common/Filmstrip.tsx` is the layout arrangement the gallery and Recently Finished both stand on: a
row of artwork at one fixed height, each child keeping its own width, scrolled rather than wrapped
or cropped when it overflows. Height is the only dimension it fixes, which is what lets a 16:9
banner and a 2:3 poster share one row without either being cropped — the reason this is a strip
and not a grid, since a grid cell has a width and a width plus a height is a crop.

It states that height on its children rather than leaving them to ask for it. A card is
`height: 100%`, and 100% of the strip's box is the row plus the allowance the strip adds for its own
scrollbar — so a card left to resolve it stands ten pixels taller than the picture inside it and
paints its own ground under every one of them. The selector is doubled (`&& > *`) because the card
carries a one-class rule about the same property, and two selectors of equal weight are settled by
insertion order, which puts a child's class after its parent's.

`omnibus/CardMediaImage.tsx` is the `TypedCardMediaImage<OmniItem>` every one of these surfaces
renders through: it dispatches `item.source` to the domain's own component by `item.medium`, so a
picture in the gallery or the crossings' hover cards opens that domain's real expanded card, strip
and ledger rather than a fourth, poorer copy of them.

### Filter drawer, Top lists and drill-down — shared shells

Three pieces here are domain-blind shells every tab assembles from.
`common/FilterDrawer` owns the two floating buttons, the bottom drawer and the Clear/Close row,
taking the domain's toggles and category multi-selects as fully controlled children —
`FilterToggle` and `FilterCategory` alongside it, with `common/filterOptions` deriving each
select's values from the data. `common/TopList`'s `TopListCard` is the "Top X" card — proportional
bar, ranked swatch legend, shared hover dim — over items that arrive already coloured and already
reduced to percentages by `common/statsData`'s `topNWithOther`; how a domain groups and colours is
exactly what varies, so none of it lives in the shell. `common/GroupedStatList` is the strip of
grouped cards that drills into a group: it owns the open handle, the expand badge that sets it, and
the drill-down's card keys, and mounts `common/DrilldownDialog` — the fullscreen list itself — only
while a group is picked, so a domain supplies its groups, its labels and its artwork and nothing
else. The franchise
machinery is shared the same way: `common/franchiseIndex` groups by whatever accessor a domain
passes, and `common/franchiseContext`'s factory threads the index down to the card strips.

### Franchise strip — `common/FranchiseStrip.tsx`

The strip on an expanded card and in the hero's panel: every entry of the item's franchise the reader
has met, across all four media, with the card's own item singled out. It has two readings and a
switch between them. **Order** is the default — one bead per entry in the order met, evenly spaced
whatever the dates between, the year stated beneath only where it changes, wrapping like a line of
text once the beads would fall closer than their minimum pitch. Time is dropped from the axis
entirely, which is what keeps a bead the same size on a fifty-entry franchise as on a five-entry
one; a chain that has to wrap stops each row's line at its first and last bead, so it reads as a
chain that turned rather than one that broke. **Time** draws the same entries against a window of
the franchise's own years (`stripWindow`: the January of the first start to the December of the last
end, held open to three years), with the fixed epoch–today scale bracketed on a thin bar beneath so
cards stay comparable. Lanes open only where entries genuinely overlap, never per medium — which
medium a mark belongs to is its fill — and each lane is a fixed 16px pitch, so the strip grows to
hold its lanes and no band shrinks to fit. A film is a point (`start === end`) and is drawn as a dot,
since a bar floored to a percentage of the width is a different number of pixels on every card.
The reader's last choice of reading carries from card to card for the life of the page.

Both readings stand on the theme's paper inside whatever ground the card has, most often a tint of
the artwork's own colour, because every fill the app declares is solved against the two papers and
against nothing else. Marks wear the medium's fill and nothing more: the platform, status or genre a
strip could colour by is already stated in the ledger below it, and a second vocabulary on marks a
few pixels wide is one nobody can read. The subject is set apart by a ring in the ink and a name,
never by colour, and only where there is context to stand apart from — a standalone show's own
seasons are all the subject, and ringing every one of them says nothing. A show's card treats every
season of the show as the subject and names the latest of them.

The entries come from one index built across the four libraries (`common/franchiseUnion.ts`,
`omnibus/franchiseUnionData.ts`), which is what lets a Star Trek film's card on the Movies tab draw
the seasons from the Shows sheet. A tracked domain may not import another and `common/` may import
none, so the union is built beside the Omnibus adapter — the one place that already imports all four
— and provided from the shell (`Google.tsx` mounts `FranchiseUnionProvider` above the outlet), through
a context declared in `common/` whose entry shape each domain's own records are assignable to. Each
domain's card reads the union and falls back to the strip its own index draws until all four
libraries have landed. The provider calls `useData` with the four domain configs the way the Omnibus
does; the module-level cache means a session that opened on the Omnibus reaches a home tab with
nothing left to fetch, and only a deep link straight to a home tab pays three extra sheet reads. The
union groups on the raw franchise column exactly as the per-domain indexes do — a founding entry
keeps naming itself, a standalone is a group of one that every consumer tests for — and does not
apply the crossings' rule that drops a group whose every entry repeats the name: that rule chooses
which franchises a section draws at all, and a card has already chosen. Each domain names its own
union key (`gameKey`, `seasonKey`, `movieItemKey`, `bookItemKey`) and the adapter keys its rows on
the same functions, so the strip and the Omnibus cannot disagree about which entry is the card's
own. The hover card behind each bead is the Omnibus's own dispatcher, loaded lazily with the chunk
that draws it, so the provider adds nothing to the first bundle beyond the adapter.

### Card strip data — `common/timelineStripData.ts`

The proportional-scale arithmetic the Time reading, the crossings and the Movies ribbon share.
`buildStrip` places each span against a `from`–`to` scale and returns it as a percentage offset and
width alongside the caller's own fields, so a domain never has to key its records back out of the
result.

Bands are positioned rather than chained. Walking gaps and bars in sequence turns an overlap into a negative gap, which drifts every later bar along the strip, and lets a minimum width push the total past 100% so flex shrink quietly distorts all of them — and a franchise produces overlaps routinely.

Spans that do overlap take separate lanes, because a band drawn over another hides it completely and takes the pointer with it, leaving no way to reach the buried one. Only a genuine overlap opens a lane: a span abutting the one before it — a season handed over to the next, a game to its sequel — stays in the lane and is tiled clear of it instead, because a lane costs every band in the strip a share of its height. Both rules are date-based and shared with the full timeline through `assignRows` in `common/timelineLayout.ts`, so the two charts cannot come to disagree about what counts as an overlap. The year gridlines come from that module's `buildTicks` for the same reason. `buildTicks`, `buildStrip` and the full timeline's own bars (`common/Timeline.tsx`) all place their offset through one function, `percentAtDate` — "the days elapsed before this date" — so a tick and a band opening on the same day land on the same percent; `percentOfSpan` is the width measure the same three read from.

`TimelineCard` in `common/Card.tsx` is the renderer the crossings stack still uses, taking bands and ticks rather than nodes: the shell owns the whole coordinate space, so a caller reads `startPercent` and `widthPercent` and never asks how they were arrived at. Orientation lives entirely there — the data is percentages and knows nothing about which axis it will be drawn on. The card's own strip draws its Time reading through the same arithmetic but its own marks, because it wants a fixed lane pitch, a dot for a point and a ring for the subject, none of which a stack of twelve strips on a shared scroller has room for.

### The expanded card — `HeroStatRow` and `MetadataLedger`

Below the strip, an opened card says its facts in two tiers rather than as one uniform grid of tiles. A grid gives a game's publisher the same weight as its hours, which is the one thing a reader is least likely to have opened the card for.

`HeroStatRow` is the figures — a game's hours and days to beat, a show's episodes and hours — as large tiles. `StatTile` carries them at a `hero` size and paints its own ground where the field has a colour: status is a fill in every chart on the tab, so the status tile is that fill with `getContrastText` type, on the same rule the chip in the card's corner follows.

`MetadataLedger` is everything else, as label/value lines in two CSS columns at `md` and one below it. Columns rather than a grid because the rows are independent: a grid holds each pair to the tallest row on it, so a value that wraps opens a gap beside it. Related facts share a line — a release is a date and a format, a game is made by a developer for a publisher — which is what keeps the ledger to a third of the height the tiles took.

A row carries a colour swatch exactly where the app already speaks that field's colour somewhere else: platform, franchise, genre, rating, status. Developer, publisher, format and dates get none, because a swatch on a field with no colour vocabulary teaches a legend no chart honours. Both shells take plain `{label, value, …}` arrays, so `common/` never learns what a PEGI rating is; the four domain `CardMediaImage.tsx` files (`vg/`, `show/`, `movie/`, `books/`) build the arrays and choose the omissions, and hand them to `CardDetailBody` — the renderer in `common/Card.tsx` that composes both shells — since a tile reading zero because the sheet recorded nothing says something false where saying nothing says the truth.

All four domains use the two-tier treatment; `DetailCard`, the uniform tile, remains exported for the next domain that starts with too few facts for the split to buy anything.

### Scroll marker — `common/ScrollMarkerHook.ts`

The library grids are hundreds of banner cards deep with nothing between them, so a reader scrolled into one has no way to tell where in the sort order they are. A pill fixed just under the section rail names it: the year of the topmost visible row under the date sort, that row's franchise initial under the franchise sort. `finishedBucket` derives the label from the same field `finishedItems` orders by — through the same `franchiseKey`, so a work with no franchise recorded falls back to its own title in both places — so the marker and the wall cannot disagree about which field is in play, and it answers `null` for a value with no short form — an undated item, which the date sort places first, so the topmost card genuinely can be one.

Each card wrapper carries its label as a `data-bucket` attribute, and the scroll handler binary-searches the wrappers for the first whose rect clears the reading line. The wall runs to a thousand cards and the handler answers every scroll event, so measuring each in turn would be a thousand layout reads a frame; document order is reading order and a row's cards share an edge, so the rects are ordered and can be halved in on. Each answer — label, visibility, offset, whether that offset is a centre — is a primitive in its own state, so a scroll that changes none of them re-renders nothing, where one state object would allocate a fresh one per event and re-render the whole wall.

The gutter the pill floats in is measured from the section's own rect rather than from the container's breakpoints, so no copy of those margins lives here. Below the width that gutter needs, the pill tucks inside the container's leading edge instead.

Where that gutter is wide enough, the same derivation is presented as a jump rail instead — the whole sort as a column of chips down the page edge, spread across the viewport from just under the section rail to short of the fold. `orderedBuckets` folds the wall's `data-bucket` attributes to one entry per bucket at first encounter, and holds them in **wall order** rather than sorting them: descending years under the date sort, ascending franchise initials under the franchise sort. What that guarantees is agreement with the wall, which is the thing a position indicator actually has to have — sorting the labels here would derive the rail from the data a second time and let the two answers drift. Both sorts happen to open each bucket once, a year being unique and franchise-ordered initials non-decreasing, so the highlight only ever travels downwards as the reader scrolls; taking first appearances is what would still hold the rail together for a key that returned to a value it had passed.

The chips are spread with `space-between` across the full span rather than packed under the rail, because what they index is the whole page. A rail is used only when every chip fits at full height — bucket count times a minimum slot against the measured span — so a short viewport with many buckets falls back to the pill rather than overflowing or nesting a scroller. Narrow gutters fall back the same way, and the two presentations are exclusive: the lit chip already says what the pill says.

Jump and highlight share their geometry rather than agreeing by convention. `jumpTo` brings a bucket's first card to rest at the marker's own top offset, which puts its bottom past the reading line, so `topmostBucket` names the bucket that was clicked on the very next scroll event — the click never sets the highlight. The distance rule is the timeline's: smooth under a viewport and a half, instant beyond, where the animation would only be a wait.

**The wall has to reserve its own height, or no offset measured in it means anything.** Grid artwork is `loading="lazy"`, and an image that has not loaded contributes no height of its own, so a wall of them stands at a fraction of its real size — 7,152 pixels against 33,541 for 322 games. Every offset read from it is short by all the artwork below, and scrolling into a region is what makes that region load, so the page grows under the reader as they travel. A jump far down the sort then asks for an offset the document does not yet have and lands clamped at its bottom, a decade short of the chip that was clicked. `Finished` therefore reserves the shape on the grid's media, through `shapeToAspect` so the figure is the one `cardArrangement` declares rather than a second copy of it. The leading `auto` that helper prefixes is what keeps this a reservation rather than a crop — the artwork's own shape wins the moment it is known — and it takes the cold document to within 0.1% of its loaded height. The stat strips reserve too, but firmly, through `shapeToRatio`: a strip lays its cards side by side, so an artwork a few pixels off its shape standing at a different width from its neighbours is the failure there, where a wall wants the artwork's real shape to win. The hero and the timeline tooltips are untouched; the Omnibus reserves on every card instead, from its artwork's shape, because a strip of mixed pictures has the same problem sideways (§6).

What is left after that is a card's own rounding, and a bounded settle loop absorbs it. It re-measures the target's own rect on a ~90ms cadence and issues instant corrective scrolls until the card's top is within two pixels of the marker offset. Corrections are always instant however the jump was made, since a correction is the same landing arriving at its real offset rather than a second jump.

Three things bound it: ten corrective scrolls, a two-second deadline, and a token a newer jump takes so an older loop abandons the page rather than two loops correcting towards different cards. Only a scroll the loop actually issues is spent against the count — a tick that finds the page still moving is free, or images streaming in would exhaust the allowance before the first correction. For the same reason the wait for a still page is capped at six ticks: the browser's scroll anchoring nudges the offset on every image that lands above the viewport, so a streaming wall never fully stops, and a slightly drifting page is worth measuring because the next round corrects whatever the drift left.

**Interference is read from input, never from the page having moved.** Anchoring adjusts `scrollY` precisely to compensate for the growth this loop exists to correct, so treating drift as a reader taking the page back would abort on exactly the condition the loop is for, leaving a jump that reads as correct and lands in the wrong decade. `wheel`, `touchmove`, a scrolling `keydown` and `mousedown` are what end a jump — the last for the scrollbar, which moves the page without any of the other three. They are attached for the settle window only and removed on every exit, along with the one an unmount takes. None of them can catch the click that starts a jump, since they go on during that click's own `click` handler, by which point its `mousedown` has passed.

A bucket boundary falls mid-row for most buckets, so the row a jump lands at the top usually opens with the previous bucket's spill and ends in the one that was clicked. The marker therefore reads the reading row's _last_ card, not its first: naming the leading card would light the chip beside the one the reader pressed for every mid-row boundary. The one landing that still cannot name its chip exactly is a bucket near the end of the sort, whose row cannot reach the marker offset because the scroll clamps at the document's end — the clicked bucket's first card is on screen regardless, which is what the reader asked for.

The bucket list re-derives at the marker's own cadence, so both answers always describe the same DOM, and only a sort or a data change can actually move it. Comparing the joined labels is what keeps that free — a scroll that leaves the wall alone sets the array already held and re-renders nothing.

### Stats and cards

`common/SectionHeader.tsx` is the header every chart card wears: icon and title left, a muted population count beside the title, controls pinned right. It is a thin arrangement over `CardHeader`, so the theme's `MuiCardHeader` spacing and the `h6` weight reach it without a second set of rules to keep in step. The count arrives as an already-worded string — a `common/` shell cannot know it is counting games — which is why the chart shells take `title` (and, where a population means something, `count`) as props and the timelines are handed a whole header by their domain. Below `sm` the controls take a row of their own: `CardHeader` seats its action beside the title at every width, so a title and three or four controls divide 375px between them and the title wraps to a word a line — a gallery header carrying a select, two sort toggles and an expand reads "Shelves / by / Genre" beside them.

`common/Stats.tsx` exports the composable pieces the domain `Stats.tsx` files are assembled from — `StatCard` (a row of labelled figures), `StatList` (a scrollable strip of media cards with a fullscreen dialog), `VitalsCard` (the band the page opens on) and `TotalsBand` (a proportional segmented bar with labels). It builds the bar from `Segment`, which lives in `common/Card.tsx` alongside the other proportional-bar primitives. Domain `Stats.tsx` files assemble these into a grid; they hold the arithmetic, the shells hold the layout.

`StatList` is itself assembled from two smaller shells that the same file exports, because a domain needed each of them on its own:

- **`ExpandableCard`** owns "a card that can also present itself fullscreen". It calls its `renderContent` twice — inline and for the dialog — and hands it the expand control to place in whatever header it builds. The dialog body is mounted only while open, so a strip of cards is not built a second time behind a closed dialog: `useDialogMount` (`common/useDialogMount.ts`) pairs an `open` flag with a `mounted` flag that lags it until `onExited` fires, so the body survives the exit transition. `ExpandableCard` gates only its dialog body with `mounted`; `CardMediaImage` gates the whole `Dialog` element the same way, because an uncapped wall mounts one per item and a closed `Dialog` still renders itself, its `Modal` and their hooks before returning null.
- **`StatsListGrid`** owns the capped strip of media cards. The caps are `COLLAPSED_CARDS` and `EXPANDED_CARDS` (6, and 500 — effectively "everything", so a drill-down dialog shows the whole group), applied _here_ rather than by callers — a caller that pre-sliced its own list would make changing either constant a no-op for that list. Six is what a half-width card holds without growing past the charts beside it; a strip laid out differently passes its own figure through `StatList`'s `collapsed`, which is a limit and still never a list. The Omnibus's Recently Finished states its cap in rows instead, through `collapsedRows` — two — since how many cards its sized row holds follows from the measured width, and any count of cards would leave the second row part-filled at most widths. Card artwork loads lazily, which is what makes the uncapped dialog affordable. Only `EXPANDED_CARDS` is exported: `omnibus/Gallery.tsx` derives its shelf count from it and `common/DrilldownDialog.tsx` reuses it as the fullscreen list's own limit, while `COLLAPSED_CARDS` has no caller outside this module.

Each has a caller of its own beyond `StatList`: `Finished` is built on `ExpandableCard` but keeps its own item grid, because it renders bordered full-width cards rather than media cards; and `DrilldownDialog` reaches for `StatsListGrid` directly to fill the fullscreen list a grouped card drills into.

The one piece of shared arithmetic is `assignPercents` in `utils/mathUtils.ts`: it floors each slice at 0.5% so tiny categories stay visible, then absorbs the resulting shortfall into the first entry so the bar always fills exactly. `TotalsBand` and `common/TopList` both use it. `total` is a parameter rather than derived, because those two callers scope it differently — one over all data, one over just the rows on screen.

A stat card's own words follow the same two ranks the hero and the Now band state: `FooterComponent` reads its rows bottom-up, so the closing row carries the figures at `subtitle2` and semibold while the rows above it are the context those figures belong to, set as labels — `caption` size under `LABEL_SX`, in the muted tone. Toning alone is not enough: at one size the two rows read as a single line dimmed rather than as a hierarchy. Every domain puts a date, a season or a group name in the context row and its figures below; the Omnibus is the one caller whose closing line is a name, which is why `omniLabels` states the date first — a card whose title is the dimmer of its two lines reads as a date with a caption.

`common/Card.tsx` provides `CardMediaImage` plus the `TypedCardMediaImage<T>` contract that every domain implements (`show/`, `vg/`, `movie/`). This is the adapter type that lets generic components — `Finished`, `StatList`, timeline tooltips — render domain-specific artwork and detail panels without knowing the model. Two of its props are shaped by cost rather than convenience:

- `detailComponent` is a thunk (`() => ReactNode`), not a node. `Finished` renders one card per item with no cap, and the dialog body is ~15 elements that are only ever mounted for the one card the user opens. `TimelineData.tooltip` is a thunk for the same reason and is the other place the convention applies: the timeline positions every row it is given, but only the hovered one needs a card, and a node would be built up front and then held for the life of the layout (§7, object lifetimes).
- `extractColour` is an explicit opt-in. Deriving a card's theme from its artwork costs a canvas read per image, so it is requested rather than inferred from the presence of some other prop.
- `shape` is how a card arranges itself when the surface holds more than one shape of artwork, and only the Omnibus passes it (§6, the mixed-media rule).

Every chart mounts that card through one shell, `common/HoverCardTooltip.tsx`: the shared width, a
mat of the hovered bar's own colour with the arrow to match, and the flip that keeps a tall card on
screen in a chart that scrolls sideways. The artwork inside one is reserved at its declared ratio
firmly, not with the `auto` reservation a wall uses: a tooltip is positioned once, at the moment it
opens, so a card whose picture has not loaded opens short, grows by a few hundred pixels, and never
reflows — which is what put a card seen for the first time off the screen and a card seen again in
the right place. A tooltip's own ceiling is 300px, so a chart left to mount
its own opens a card two thirds the size of its neighbour's — which is what the Omnibus did. A band
whose tooltip only names its span keeps the plain tooltip; `hoverCard` on the band is what asks for
the card treatment, because a line of text in a 500px box is mostly empty ground.

Each domain also exports the **hover card** its charts show — `VgHoverCard`, `ShowHoverCard`,
`MovieHoverCard`, beside its `CardMediaImage`. A chart names the component rather than assembling a
panel, and the Omnibus dispatches to the same three by medium, so a hovered bar shows the same card
wherever it is hovered. A second assembly on the Omnibus is two cards for one item with nothing
holding them together: they would divide on which figures a card carries — whether a film shows its
score — and, because the Omnibus's cards also declare an artwork shape, on the arrangement, which
stretches a show's card out of the proportions its own tab draws it at.

### One arrangement rule, for the one tab that needs it — `common/cardArrangement.ts`

A card given a `shape` arranges itself by it: **landscape artwork stacks its words below, portrait
artwork seats them beside**. It also reserves that shape before the image loads, from the same
table, so what a card holds space for and what it is arranged for cannot come apart.

The rule exists because a mixed row is where a single arrangement fails. A banner is four times as
wide as it is tall, so words beside it get a sliver of a column; a poster is half as wide as it is
tall, so the strip beneath it is a hundred pixels across and clamps every title to three characters.
Arranging by shape gives each of them the axis it has room on, and a row then varies gently in width
at one height instead of holding half its cards to a shape their artwork does not have.

**Only `omnibus/` passes a shape.** Each home tab's artwork is all one shape — Games banners, Shows
and Movies posters, Books covers — so its pages are laid out for that shape already and the question
never arises; a card that names no shape keeps exactly the arrangement its caller gives it, which is
what leaves the four tabs untouched by any of this. The Omnibus names one per item, because that is
the tab whose every row holds all four.

A cover is a third shape rather than a second kind of poster, and the difference is exactness. A
poster is authored to 680×1000 and a banner to 16:9, so a layout can hold either to its declared
ratio and letterbox nothing; a cover is whatever its publisher drew, near 2:3 and a few percent off
it in either direction, and no two alike. `shapeIsExact` is what a surface that pins a ratio asks:
where it would hold a poster to 680×1000 it gives a cover the `auto` reservation the walls use, so
the declared ratio sizes the card until the file loads and the file's own ratio then wins. The Now
band and the hover cards are the two such surfaces.

What travels is the shape, not the arrangement. `CardMediaImage` decides everything that follows —
the card's axis, the artwork column, the reservation, the edge that carries the seam — and publishes
the result on a context that `CardPanel`, `FooterComponent` and `StatTileGrid` read, so the two
halves of one card cannot come to disagree about which way round they are and no call site repeats
the decision. Two consequences are shaped by the column rather than the card: a footer's rows are
read down a column and so are given lines to wrap onto with a three-line ceiling, and a tile row
fits as many figures as the column holds and wraps the rest, since a third tile in a 60px slot is
narrower than the word under the figure and would be pushed past the card's edge.

The ratio a layout measures is the declared one and never a file's own pixels. Artwork is authored
to 16:9 and 680×1000, but an individual file can be off by a few pixels, and the Now band would then stand
its two poster cards at different widths for a reason no reader can see — one bad export becoming a
visible difference in the page. Sizing from the declared ratio makes every card of a kind identical
and leaves an off-size file to be letterboxed until it is redrawn.

Bare artwork is not arranged at all. The rule divides a card between a picture and a column of text,
so a gallery shelf's pictures — which carry no words — keep the whole card; applying it there hands
half the width to a panel that is not present and draws the picture at half the size.

### Page architecture — hero, rail, sections

Every tracked domain lays its page out by temperature: what is being played, watched or read now,
then what the library is made of, then what can be explored, then the deep dives. Three shells carry
it.

All four tabs lead with a single item, each by a tie-break its data genuinely holds. Games
promotes the game in progress, and Books the book in hand, most recently begun first. Movies
promotes the film watched most recently, which every film's watch date defines. Shows is the one that needs the sheet's help: several shows are always in
flight at once, so the current one is whatever the Status cell on an in-progress season row marks
with a last-watched date — and until the sheet marks anything, the page falls back to the
currently-watching strip alone rather than promoting a show by a tie-break the data does not
hold. The rest of the in-flight shows stay in a compact "Also Watching" strip under the hero.

`Hero` (`common/Hero.tsx`) presents one item large. Its figures are the item's own — hours logged,
days in, the size of its franchise — and each tile is dropped rather than shown as a zero when the
sheet does not hold it. The library's totals stay in the cards below it, which are their single
home. Only the artwork's height is fixed, so the hero is one height whatever it shows while every
poster and banner keeps its own shape uncropped. The panel is held to that height, and a title, a
subtitle and a row of tiles fill a third of it; the middle is the item's own story — its franchise
strip in the order met (§6, Franchise strip), and the two ledger rows its domain leads with, chosen
per domain from the same rows the expanded card states in full. On a phone the panel is only as
tall as its own lines, so the strip is dropped there and the rows stay.

It renders the domain's own
`TypedCardMediaImage` rather than a bare image, which is what keeps it in step with every card
below it: the artwork opens the same expanded dialog a thumbnail does, and the panel rides in as
that card's `footerComponent`, which is what puts it inside the `ArtworkAccent` the image
publishes. Reading the accent any other way would mean sampling the same image twice and painting
from whichever answer arrived first.

`SectionRail` and `Section` (`common/SectionRail.tsx`) are the page's own table of contents,
pinned under the app bar — which is `position: static` and scrolls away, so the rail is the only
thing an anchor has to clear. Chips scroll rather than link, because the app is served under a
`HashRouter` and an `href="#timeline"` would be read as a route. `Section` exists rather than a
bare `id` for its `scroll-margin-top`: without it the browser lands a section's top edge
underneath the sticky rail, hiding the thing the reader was sent to see.

The same module holds the two arrangements a section is built out of, because they are page
structure rather than visualisation: `StatBand`, the stretched row of stat cards, and `ChartPair`,
the md-split that stands a sunburst beside a barchart. Both take children and nothing else. Writing
the grid container out at each of the eight sites instead spreads one spacing rule across two
domains, and leaves the reason a tab pairs those two charts stated twice.

Each domain's `sections.ts` owns the id map and builds the chip list. The ids have two holders —
`Stats` carries the bands above the charts, `Graphs` everything below — and the list is built from
the same test `Stats` makes about whether there is anything to lead with, so a chip never points
at an anchor that is not on the page.

### Colour

`utils/colourUtils.ts` extracts a dominant colour from each banner image with `fast-average-color`, ignoring near-white and near-black. If the result's ITU-R BT.709 luma falls outside 30–230 it retries with the `simple` algorithm, avoiding unreadable extremes. Results are memoised by image src. Cards then set text colour via MUI's `getContrastText`, so a card's palette derives entirely from its artwork.

**Every chart colour is a pair, not a value.** `utils/types.ts` declares `Fill` as `[light, dark]`: the light half is drawn only on the `#ffffff` paper and clears 3:1 against it, the dark half only on `#1d2126` and clears 3:1 against that. Neither half ever has to survive the paper it is not on. A single hex held to both at once is confined to OKLCH L 0.526–0.668, a span of 0.142 — and while chroma barely suffers in that band, lightness _is_ the identity of the warm half of the wheel: a yellow at L 0.67 is `#af9300`, an olive, where the same hue at L 0.88 is `#fdd500`. Splitting the value is what lets a yellow be yellow.

Every lookup therefore takes a `Scheme`. Components read it from `common/useScheme.ts`, which reads `window.matchMedia("(prefers-color-scheme: dark)")` through `useSyncExternalStore` rather than MUI's `useColorScheme`. `Google.tsx` builds the theme with `cssVariables: true` and names no `colorSchemeSelector`, so MUI's default emits the dark palette inside that same media query and the system setting picks the surface on its own — but `mode` is a separate piece of state MUI restores from a `mui-mode` key in `localStorage`, and the moment anything writes one the two answers part company, with every fill on the page then taking the half meant for the other paper, on every render, and nothing on screen to correct it. The hook also subscribes its caller to scheme changes, which is what re-renders a chart when the reader's system flips at dusk; the CSS variables turn over without React otherwise noticing. `tests/utils/fillContract.test.ts` asserts the floor over every table, against a WCAG implementation of its own so it cannot pass by agreeing with a bug in `src/`.

Values are placed rather than picked: a hue and a role go in, and the lightness is solved until the value clears its floor. Where a real-world source exists it is the anchor. The age-rating ramp is built on the colours PEGI actually prints — its lime `#a5c400`, its amber `#f5a200`, its red `#e2011a`, sampled from the official rating icons. PEGI gives 3 and 7 one colour and 12 and 16 another, so splitting each pair is a deliberate divergence and a necessary one, since a chart drawing 3 and 7 alike cannot be read. The split is made on **hue as well as lightness**: separated by lightness alone the pairs land about dE 11 apart where telling two fills apart wants 15, and on both axes they reach 19.0 and 15.0. BBFC colours its own 15 pink, which breaks the ordering the ramp depends on, and this table merges BBFC 15 with PEGI 16 into one band — so PEGI's ordering wins.

The status ramp states its order in **relative luminance** rather than lightness, because that is what a reader squinting at a chart sees: a green at one OKLCH lightness carries roughly twice the luminance of a blue, so a ramp placed on lightness alone puts Beat above Endless and inverts the reading. `Endless` and `Up To Date` are separate states — a show you are current on that is still running is waiting on its source, where a game with no completion state was never going to be beaten — so the blue is the waiting state alone and Endless joins the greens beside Beat/Ended.

The decade ramp sweeps hue alongside lightness for the same reason the ratings do: eight buckets of lightness alone land neighbours 2.3 dE apart, and the 2010s beside the 2020s at 0.8, under the ~2 dE at which two fills are simply the same colour. Sweeping sepia gold to deep russet doubles that to 4.6 and takes the ramp's ends from 13.4 dE apart to 32.1.

Fixed colours are the other half of the system: `types.ts` in each domain maps platforms, genres, franchises and ratings to values, and `utils/types.ts` holds the cross-domain ones. Brand tables keep their brand's hue and chroma and move only lightness, as far as the contract demands of the half being drawn — a brand already inside the band on both papers carries one value twice, which Mario, Marvel and Zelda all do. Pokémon is the clearest gain from the pair: `#ffcb05` is its published yellow, and a yellow held to 3:1 on white is a brown-gold, so the light half pays that price and the dark half is the brand hex itself.

`vg/types.ts` splits a company two ways. **Fills** are what chart geometry takes; **accents** are the brand hexes themselves, drawn only in a card's corner chip, where a few dozen pixels carrying two or three letters are read as a badge rather than compared against a neighbour. PC is the one entry with no brand to reproduce — it is a category, not a company — so it takes the amber of the beige box. Steam is the obvious anchor and the wrong one: its palette is a cool blue-grey family sitting on PlayStation's own hue, and two blues separated only by lightness and chroma read as one blue however far apart they measure. Putting PC in the warm arc is what lets the other two be themselves — PlayStation keeps its published `#006FCD` on both papers, and iOS takes Apple's own space grey and silver — a warm cast on it would buy nothing, PC having left the cool region to it. With that region holding only iOS and the neutral, a lightness gap is enough to separate them; that gap is the table's weakest link at 11.8, under the 15 two fills want, so the wedge labels and legend names stay load-bearing for that pair, which meet only in the Top Platform list where every row is named.

The genre ramp is the one all four tracked sheets share, so a hue means one genre on every tab, and it falls to `NEUTRAL_FILL` off-table because the column is open-ended. **Franchise is shared for the same reason and answers `""` instead.** All four sheets record a Franchise column and eleven franchises are met in more than one medium — Marvel across all three, Star Wars and Harry Potter across games and film, Fate and Star Trek across games and television — so a per-domain table would draw one of those a different colour on each tab. The set is scoped to what a tab's collapsed Top Franchise card and the gallery's shelves actually draw, plus every cross-media franchise among them; the long tail is 168 values in the games sheet alone, most of them a work naming itself, and takes the empty answer the way an unknown network does. `tests/utils/fillContract.test.ts` pins the property directly: a cross-media franchise resolves to one value through all four domains' `groupToColour`. Games draws a second vocabulary beside it — `gameplay` is how a game is played where `genre` is what it is about — and the two tables share exactly two hexes, Action and Adventure, which mean the same thing in both and are deliberately the same colour. The rest are pushed as far apart as one lightness band holds, which is not always far: fourteen gameplay hues and eleven genre hues are twenty-five values each wanting 15 dE of room, so Role Playing lands 2.3 from Thriller on the dark paper. Both are still drawn at full chroma, because the two vocabularies are always labelled where they meet — the ledger stacks a Gameplay row on a Genre row, and the hero and hover subtitles name each swatch beside it. Desaturating one ramp does not recover this: it separates the two by kind without moving any pair, and muting the genres by 45% leaves the worst cross-table pair at 4.5 dE with more pairs under 15, not fewer.

Seven vocabularies live in `utils/types.ts` because more than one tab speaks them: the genre ramp, `statusToColour`, `franchiseToColour`, `decadeToColour`, the score bands (`scoreBandToColour`, which Movies and Books both rate on), `ageRatingToColour` over the `AgeRating` union three of the four domains record a certificate into, and the medium fills (`mediumFills`, with `mediumToLabel`, `mediumToName` and `mediumUnit` beside them), which every card's franchise strip colours its beads by and which `omnibus/types.ts` re-exports under the names that tab speaks. The status table treats Playing, Watching and Reading as one state and Beat, Ended and Finished as another — each word takes its state's fill exactly, so a chart over the union draws one colour per state rather than one per sheet's vocabulary. Books adds one vocabulary of its own in `books/types.ts`: the three formats, one hue each at chroma 0.14, drawn only in a labelled band and the filter's chips. Games are logged as PEGI and write the suffix (`16+`), Shows and Movies as BBFC and write the bare number (`15`); the colour keys off the age rather than the notation, so one swatch means one thing across the tabs, and `isAgeRating` lets each converter reject a bad cell while it still knows which row it came from. `ageRatingBand` is that same tier named rather than coloured, and is what the colour is looked up by.

Movies adds one vocabulary of its own in `movie/types.ts`, the Cinema/Home pair, and re-exports the shared score bands — a valenced red-through-amber-to-green ramp with Unscored on the neutral — under its own name. Shows colours its networks as brand-derived fills with `""` off-table — the column gains a new streamer whenever one launches, and a crash is the wrong response to that. A network is keyed on the string the **sheet** writes rather than the brand's current name: `HBO` is the sheet's value even though the brand is now HBO Max, and renaming the key would silently drop the colour with no error anywhere.

`artworkPalette` in `common/artworkPalette.ts` is what every surface carrying a sampled colour reads: a thumbnail's footer strip, a timeline hover card's panel, the hero band's ground, and the expanded card's ground, tiles and strip. It sits in a module of its own rather than beside the card that publishes the accent, because a hook exported from a file of components is a hot-reload boundary the lint rules refuse. One recipe rather than several treatments that happen to rhyme.

The ground is the sample exactly, because that is what ties a surface to the artwork beside it. Extraction holds anything between luma 30 and 230, so which of black and white can be read on it changes from card to card — the type is therefore derived from the ground with `getContrastText` rather than fixed, and turns over with it. The remaining tones are that same contrast colour made transparent: over a coloured ground it composites to a tint of the ground's own hue, which is what a secondary tone wants to be, and it needs no rule for which direction to mix in. That covers the muted tone for dates and labels, the rules and empty tracks, the wash that lifts a tile, and the three-pixel seam every surface draws where it meets its artwork.

The palette is total: with no sampled colour it fills the same shape from the theme. Extraction arrives seconds after the page and sometimes not until a reload, so the colourless state is the one every card paints first — leaving it outside the recipe is what would let the two halves drift apart, and it means no surface carries a branch asking whether there is a palette to read.

`CardMediaImage` publishes its accent on that module's context, and every surface inside it — panel, strip, hero tile, ledger row — derives the palette from that. The card is the only thing that knows its own ground, and the alternative is naming it at each of the tiles and rows the three domains build, plus a second mechanism for the surfaces that are not tiles.

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

**The compiler silently skips functions it cannot prove safe**, which makes bailouts the thing to watch. Two constructs in particular opt a function out, both without an error to say so:

- **`this`** anywhere in the function. Highcharts binds the chart to `this` in its event callbacks, so those must live at module scope (see `dimLeafRing` in §6) or they take the whole component down with them.
- **`??=`**, which the compiler cannot yet lower. Write `x = x ?? y` instead.

A third construct bails the same way: a **destructured prop with a default value** (`({ landscape = false })`) is an assignment pattern `BuildHIR::lowerAssignment` cannot lower, and it takes the whole component out. Components here therefore read defaults off the props object (`const landscape = props.landscape ?? false`), or rename in the pattern and default below it where a rest spread must not pick the prop up. A fourth is an **import expression**: `import()` cannot be lowered either, so a dynamic import written inside a component or hook takes that function out, which is why each entry component keeps its `import("./Graphs")` in a module-scope `loadGraphs` that both `lazy()` and the prefetch effect call. Every function currently compiles — the baseline is **214 compiled, 0 bailed** — so any bailout is a regression. A `MethodCall` bailout — the other kind the compiler produces — does respond to moving the offending computation into a plain module. To re-check after a change, temporarily pass a `logger` to `reactCompilerPreset` — see [AGENTS.md](./AGENTS.md) for the snippet.

The compiler costs about 4% of bundle size (~15KB gzipped) in injected cache slots. That is a deliberate trade, and `npm run analyze` exists to keep it honest.

### What the compiler does not do

It removes _repeated_ render work. It does not make eager work lazy, fix object lifetimes, or hoist anything out of a module-scope function. Those remain manual, and the codebase does them explicitly:

- **Concurrent rendering.** `useDeferredValue(data, [])` in every `Graphs` module keeps filter interactions responsive while charts re-render at lower priority; `Finished` dims itself (`opacity: 0.5`) while its deferred value lags, making the trade visible rather than confusing. `lazy()` + `<Suspense>` around every `Graphs` module keeps chart libraries out of the initial bundle; each domain's entry component also calls a `usePrefetchGraphs` effect (`vg/vg.tsx` and its counterparts) that starts `import("./Graphs")` on mount, so the chunk downloads alongside OAuth and the sheet fetch rather than waiting for `Graphs` to first render. The import is not hoisted to module scope: `tabs.ts` imports all four entry components eagerly, so a module-scope import there would fetch every tab's chart chunk on any visit, and pull Highcharts into the Vitest process along with it.
- **Lazy construction.** `Card`'s `detailComponent` thunk and `TimelineData`'s `tooltip` thunk (§6), plus `ExpandableCard` mounting its dialog body only while open.
- **Object lifetimes.** `Timeline`'s `useTextPlacement` keys a ref map by row objects that are rebuilt whenever data changes; entries are deleted once all three refs detach, or dead rows would retain their tooltip trees — and through them the domain records.
- **Module-scope hoisting.** `Google.tsx` caches themes per tab and reads MUI's default palette once; `Sunburst` hoists an `Intl.Collator` rather than calling `localeCompare` across thousands of comparisons. The compiler's per-component cache is a fixed slot array, so it would not survive A → B → A navigation the way the theme `Map` does.

Bundle size is treated as a first-class concern, through `npm run analyze`.

### Filter state

The distinctive part is that filter state carries a composed `filter` predicate as a _field_, rebuilt inside the reducer whenever an input changes. Components then call `data.filter(state.filter)` without knowing which criteria are active, and adding a criterion means adding one predicate to the `filters()` builder.

The generic half lives in `common/filterReducer.ts`. `createFilterReducer(initialValues, filters, nextMeasure)` returns a domain's `useFilterReducer`, and owns everything that is the same everywhere: the action union, the `useOutletContext` guest-mode wiring, rebuilding `filter` after each change, and the shared `yearPredicates` (an "up to" ceiling that disappears once it reaches the current year, or an exact-year match). Each domain supplies only what is genuinely its own — the initial values of its own fields, how to turn that state into a predicate, and how its measure toggles.

`vg/filterUtils.ts` demonstrates the full pattern — boolean toggles, multi-select categories derived from the data itself through `common/filterOptions`, a year cutoff, and a Games/Hours measure — and `show/` and `movie/` carry the same shape with their own toggles and categories. The drawer itself is one shell, `common/FilterDrawer`, taking the measure icon, the reset action, and the domain's toggles and selects as fully controlled children. The shared `yearPredicates` takes a `yearOf` accessor, defaulting to `startDate.year`, so a caller states which field answers "what year is this" rather than the function assuming one: the Omnibus passes `(item) => item.year`, since an `OmniItem` counts towards the year it closed and holds no `startDate` to read. The one divergence `yearPredicates` cannot absorb is Shows, which keeps its own predicate because it asks a different question — "has a season started in (or by) the year", not "which year does this belong to" — keeping the filter and the seasons-in-year vitals card answering the same question.

### Guest mode

Long-pressing the AppBar (`utils/useLongPress.ts`, 300 ms) sets `guestMode`, which flows down through the router's outlet context into each domain's reducer and appends a predicate — hiding adult-themed games and anime. It is a presentation filter, not a security boundary: the underlying data is already loaded, and the mode is one-way until reload. On Shows the predicate reads `type`, which every show carries; on Movies it reads the `anime` flag the converter takes from the sheet's own column.

### Theming and routing

`Google.tsx` builds an MUI theme per tab from its `primaryColour` / `secondaryColour`, using CSS variables with a dark colour scheme, and emits a matching `theme-color` meta tag. Themes are cached in a `Map` keyed by tab id — building one walks both colour schemes, typography, shadows and the whole CSS-variable map, and a stable identity also stops the MUI tree re-evaluating `sx` on navigation. Each section therefore has its own identity while sharing one component library. Both `Google.tsx` and `NavBar.tsx` resolve the active tab through `useCurrentTab` in `tabs.ts`.

Routing uses `HashRouter` because the app is served from GitHub Pages, which cannot rewrite deep paths to `index.html`. The root route and the fallback for an unmatched path are both positional rather than named: `App.tsx` renders `Tabs[0].component` for the index route, and `tabForPath` in `tabs.ts` falls back to `tabs[0]` for any path that names no tab, root included. A tab's place in the exported `Tabs` array therefore decides what a bare `/` opens — Omnibus leads the array for exactly that reason.

## 8. Extension points

**Adding a data source.** Add a `Tab` to `src/tabs.ts` (sheet id, A1 range, route id, component, colours), then add it to the exported `Tabs` array — the router and nav bar are both generated from that array, and a tab's position in it also decides what the root route falls back to (§7, Theming and routing). Create `src/<domain>/` with `types.ts`, an entry component that calls `useData` with the `DataConfig` its `converter.ts` exports, and a lazy `Graphs.tsx`. Implement `CardMediaImage` against `TypedCardMediaImage<T>` to get `Finished` and `StatList` for free.

**Composing existing data sources, without a sheet of its own.** `omnibus/` is the reference: its `Tab` carries no `spreadsheetId`/`range` (both are optional on `Tab` for exactly this case, and `SheetTab` restates them as required for anything that fetches), and its entry point calls `useData` with each of the composed domains' own exported config rather than a converter of its own. A pure adapter (`omnibus/adapter.ts`) then flattens and re-shapes their output into one vocabulary the shared shells can render. The one rule this still has to hold is the domain layer's own: the new folder may import the domains it composes, never the other way, and it stays outside `common/`/`utils/` for the same reason every other domain does.

**Adding a visualisation.** If it is domain-agnostic, build it in `common/` taking data plus callbacks, and add a thin adapter per domain. If it needs domain knowledge, it belongs in the domain folder. The existing shells are the reference for how much to invert: `Sunburst` takes four callbacks, `Barchart` takes a data function and a scalar `postAggregate`. Keep the inversion at the level of _values and meaning_ — never hand a caller an internal data structure, and never let a shell branch on a domain-specific field.

**Adding a filter.** Extend the domain's `FilterState` (which extends `BaseFilterState`), push a predicate in that domain's `filters()`, and render a control in `Filter.tsx`. No changes to `common/filterReducer.ts` or to any chart.

## 9. Repository layout beyond `src/`

- **`extension/`** — a standalone Chrome MV3 extension (plain JS, loaded unpacked) that adds "Upload Show/Movie Image" context-menu items on images and hands the URL to a macOS Shortcut via a `shortcuts://` URL. This is how banner artwork gets into Google Cloud Storage. It is entirely outside the Vite build and shares no code with the app.
- **`.idx/`, `.vscode/`** — Google Project IDX and VS Code editor configuration.
- **`analyze.html` / `analyze.json`** — committed output of `npm run analyze`. Both index a `src/holiday/` domain the tree does not contain, and neither mentions `omnibus/` or `movie/`, so what they describe is not the bundle that builds today: read as a size baseline, either compares against a shape nothing produces. The npm script prints its analysis rather than writing a file, so refreshing them is a manual capture.

## 10. Known gaps

Recorded so they are not mistaken for design:

- **No DOM or component tests.** `tests/` covers pure logic — converters, filters, the reducer, the chart data transforms and the cache round trip — and deliberately stops there; AGENTS.md explains the trade. Nothing verifies that a chart renders, and the show converter's date ordering is still only a `console.error`, which does not alter control flow.
- **`.eslintrc.cjs` is dead.** ESLint 9 uses the flat `eslint.config.js`; the legacy file remains in the tree and is not applied. The flat config is also the weaker of the two — it drops the type-checked and React-specific rule sets the old file enabled.
- **`PlainDate.valueOf` returns a string**, so every date comparison goes through `toString()` and allocates. It is correct and the ordering is deliberate (§7), but the hot path — the timeline's greedy packing loop — does tens of thousands of comparisons per layout. A numeric sort key computed once per interned instance would preserve ordering exactly, including across mixed `Year`/`YearMonthDay`. Deliberately not done: it touches the most load-bearing class in the codebase for a win nobody has measured as necessary.
- **Omnibus has no library wall.** `common/Finished` keys a card with `finishedKey`, which falls back to the bare item name whenever the item carries no `releaseDate` — a rule that holds within one domain because no two shows on record share a title, but not across a union where every season of a multi-season show carries its show's own name: a mixed wall would key every one of that show's seasons identically and React would drop or swap the cards. Reaching a wall means giving `OmniItem` a release date, a banner and a start date to satisfy the shell's contract, an `aspectOf` callback so the wall's height reservation (§6, Scroll marker — "the wall has to reserve its own height") can generalise across banners and posters in the same grid, and bucket semantics for the scroll marker across three media's own conventions. Recently Finished (§6) covers the same "what closed, newest first" question today, expanding fullscreen to as much of the run as a card strip holds and stating in its header how much of it that is.
