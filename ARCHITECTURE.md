# Architecture

Plot Device is a client-only React SPA (~23,000 lines of TypeScript) that turns personal tracking
spreadsheets into interactive dashboards. This document explains how the pieces fit together and
why they are shaped the way they are. For conventions see [AGENTS.md](./AGENTS.md); for setup,
[README.md](./README.md).

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

There is no backend, no database, and no build-time data. Four sheet ranges across three
spreadsheets are the system of record — Shows and Movies are two ranges in one file — and the browser
authenticates, fetches whole ranges, and parses, joins, aggregates and renders locally. Deployment is
a static bundle pushed to GitHub Pages by `npm run deploy`.

**Why this shape.** The dataset is one person's media history, thousands of rows and already
comfortable to edit in Sheets, so a write path and a server would cost operationally for no gain. The
price is accepted: every visitor authenticates, each session refetches whole ranges, and everything
computes on the main thread — which the caching layer (§4) exists to make tolerable.

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

The load-bearing rule is the boundary between the bottom two layers and the domain layer above them:
**`common/` and `utils/` never import from `vg/`, `show/`, `movie/`, `books/` or `omnibus/`.** Its
second half is that **a tracked domain never imports another** — `omnibus/` composes the four and they
compose nothing, which makes it a composing domain rather than one arm of a cycle.
`tests/architecture.test.ts` enforces both by reading the source, across static, side-effect and
dynamic imports alike.

Generic components take behaviour as props and callbacks; domain folders supply the meaning. Where
the shared layer needs a domain vocabulary it declares its own — `utils/types.ts` owns a
`ColourableStatus` union that `show/types.ts` and `vg/types.ts` stay assignable to, where importing
theirs would cycle, since both import `statusToColour` back out. `omnibus/` reads no sheet (§3), so it
is the one domain with no converter.

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
<domain>/converter.ts      jsonConverter()
   │                       → VideoGame[] | Show[] | Movie[] | Book[]
   ▼
common/useData             module-level Map + localStorage
   │                       → [data, dataLoaded, error]
   ▼
common/filterReducer       reducer composes predicates → data.filter(...)
   │                       (domain supplies only its own filters())
   │
   ▼
<domain>/Graphs.tsx        lazy-loaded; fans data out to common/ shells
```

`fetchAndConvertSheet` runs the converter inside the fetch, so `useData` never sees a raw grid. Only
`jsonConverter` knows a spreadsheet's column names, which is what makes a new data source cheap to
add (§8).

**A bad cell names its own row**, rather than surfacing later from a colour lookup or a chart offset
that names none. `common/sheetError.ts` holds the vocabulary — `sheetRow`, `describing`, `sheetError`
— and four readers over it: `readAgeRating` rejects a certificate outside `AgeRating`, `readGenre` a
blank, `readFullDate` a bare year where the model claims a day, and `readDatePair` a span logged at
two precisions. `readGenre` defaults its argument, since the API ends a row at its last filled cell
and a half-entered row carries no `Genre` key; genre is also read before the dates to its right, so
such a row names its missing genre rather than a date.

Converters do real modelling work, not just field renaming:

- **`vg/`** derives `company` from the platform string, folds a `"Party"` status into
  `status: "Endless"` plus a `party` boolean, splits `Theme` on newlines, computes `numDays` from the
  date pair, and checks `Gameplay` through `isGameplay` rather than casting it past
  `gameplayToColour`'s neutral.
- **`show/`** nests a flat sheet: a non-empty `Show` cell opens a show, the rows after it are its
  seasons. Seasons from `EARLIEST_SEASON_YEAR` (2005) or earlier are dropped as untrustworthy, and a
  show left with none is rejected. Dates, episode and minute sums and `lastWatchedDate` — the latest
  any season records, read from an unfinished season's Status cell, which the sheet reuses for it —
  roll up to the parent. A date-ordering mismatch is only a `console.error`; the `show` back-reference
  makes the graph cyclic (§4).
- **`movie/`** reads `startDate` from Watch Date as a full date, a blank Runtime as `0` and a blank
  Score as `undefined`: `sum` accumulates with `+`, so one `NaN` blanks every hours total, where a
  score is honestly absent rather than zero.
- **`books/`** holds every date to a full one and rejects a `Status` or `Format` outside its two small
  vocabularies, which `statusToColour` answers `undefined` for and the status band drops silently. It
  requires status and end date to agree, and rejects a non-numeric page or hour count: a `NaN` blanks
  a total, a `0` lies in a sum. A blank `Franchise` becomes the book's own name, as the other sheets
  write a standalone work.

`show/` and `movie/` split their `Genres` cell through `splitCell`, which drops empty parts.

Omnibus runs no pipeline of its own: each domain's entry component calls `useData` with a config
(`vgDataConfig`, `showDataConfig`, `movieDataConfig`, `bookDataConfig`) exported from the file owning
that converter, its version and — for Shows — the replacer/reviver pair, and `omnibus/Omnibus.tsx`
calls `useData` with the same four, so a version bump cannot land at one caller alone.
`omnibus/adapter.ts` then flattens `Show[]` at the season, the unit actually watched, carrying the
show's name, genre, franchise and certificate onto each. A book has no certificate, so
`OmniItem.rating` is optional and every surface grouping on it drops books.

## 4. Caching and hydration

`common/useData.ts` implements a two-tier cache:

| Tier                         | Lifetime      | Purpose                                                              |
| ---------------------------- | ------------- | -------------------------------------------------------------------- |
| `CACHE` (module-level `Map`) | Page session  | Survives route changes and component unmounts; suppresses refetching |
| `localStorage`               | Across visits | Lets the dashboard paint before authentication completes             |

The hook returns cached data synchronously from its `useState` initialiser, so charts render from
the previous visit's copy. `dataLoaded` starts `true` on a `CACHE` hit, every entry there having
been written by a fetch this session made, so a caller waiting on four domains can tell "still
fetching" from "already fetched by the tab you came from". Once `apiReady` turns true it fetches,
sharing one in-flight promise per `storageKey` so a second mount subscribes rather than issuing a
second `values.get`; the entry clears on settle, so a failed fetch is retried by the next mount.

The third return value is what went wrong. A gapi rejection is the response object rather than an
`Error`, so `describeFailure` reads `result.error.message` — the converter's own message, naming the
row, item and column. `DataLoadedSnackbar` holds it until dismissed and leaves the stale copy
standing: last week's data beside the row to fix beats an empty page. Its "Refresh Complete" fires
only for a `false → true` turn it watches after mount, so a caller keeps it mounted at a stable
position across that turn. Below `sm` it stands above the bottom tab bar (`BOTTOM_TABS_CLEARANCE`,
§ Phone and tablet) rather than under it, MUI's own default anchoring to an edge the tabs cover.

Two subtleties live in the serialisation boundary, and both are easy to break:

1. **The cycle.** `Season.show` points back at its parent, so `JSON.stringify` would recurse forever.
   `show/converter.ts` supplies `useData`'s optional `replacer` and `reviver` as a matched pair
   (`dropSeasonParents` / `reviveSeasonParents`); in the hook, a domain rule would silently eat any
   future field named `show` elsewhere. Both are module-scope constants, so the fetch effect can
   depend on them without re-firing.
2. **Date revival.** The `JSON.parse` reviver converts **any key containing `"Date"`** into a
   `PlainDate`, a convention rather than a schema: a field like `updateDate` whose value happens to be
   4 or 10 characters is silently miscast, and any other length or `null` makes `PlainDate.from`
   throw. `parseCachedItems` catches that inside the `useState` initialiser and drops the cached copy,
   the domain's reviver running in the same guard — a throw during render, with no error boundary
   above it (§10), takes the page down.

Cache keys are versioned per domain — `dataCacheKey(domain, version)` yields `vg-data-cache-v2`,
`show-data-cache-v3`, `movie-data-cache-v3`, `book-data-cache-v1` — and `dropSupersededVersions`
clears earlier keys on first load, matched on the domain's prefix so one tab's bump cannot empty
another's. Bump the version in the domain's `converter.ts` on any model-shape change, or returning
visitors' cached objects lack the field until their next authorised fetch — indefinitely, for a
visitor who never authorises.

## 5. Authentication

`contexts/GoogleAuthContext.tsx` owns the whole auth lifecycle:

- **Script loading.** The GIS (`accounts.google.com/gsi/client`) and gapi
  (`apis.google.com/js/api.js`) scripts are injected at runtime by an idempotent internal `useScript`
  hook, which reuses an existing tag and checks a readiness predicate before attaching a load
  listener; `App.tsx` `preload()`s both.
- **Token storage.** The token is wrapped with an absolute `expiry` in `sessionStorage`, and
  `getValidToken` evicts it once expired so a stale token never reaches gapi. A malformed `expires_in`
  yields a `NaN` expiry, which fails every validity test and discards the token on its next read.
- **Readiness.** `apiReady = tokenSet && apiReadyToFetch` — a valid token _and_ an initialised gapi
  client, so consumers wait on one flag rather than two async loads.
- **Failure handling.** A rejected `values.get` clears `tokenSet`, flipping the NavBar back to
  "Authorise", so mid-session expiry self-heals into a re-prompt. **Only the request is guarded**: a
  converter throw travels on to `useData` instead, since clearing the token would make a data fault
  look like an auth fault. A refusal — GIS delivers a dismissed consent popup to the callback a grant
  arrives on, carrying `error` and no `access_token` — is rejected by `isGrant` (`contexts/token.ts`)
  before it can leave the app reporting itself authorised on a credential-less token.

The requested scope is `spreadsheets.readonly`; there is no write path by design. `authorise` and
`revoke` are exposed as `undefined` when unavailable, so `NavBar` renders its three states
(Authorising / Authorise / Revoke) by presence-checking rather than reading separate booleans.

## 6. Presentation subsystems

### Highcharts wrapper

`src/highcharts.ts` is the single import point for charting: global defaults once — no credits, no
titles, accessibility off — and the declarative components re-exported, so a chart is composed as
JSX (`<Chart><XAxis/><Series/></Chart>`) rather than configured as one options blob. The eight
series colours belong here rather than on the theme, since `setOptions` runs once for both schemes:
every entry sits at one luminance, inside the band that clears 3:1 on either paper, so hue alone
separates two series. `tooltip.followTouchMove` is off, against Highcharts' own default: left on, a
finger dragged across an `80vh` chart drags the tooltip point to point instead of scrolling the page.
A tap still opens a point's tooltip; column tap-to-isolate and the sunburst's tap-to-drill are
untouched.

### Barchart — `common/Barchart.tsx`

The most involved shell. `data` is a _function of_ `cumulative` returning flat `{ name, date,
colour, value }` records; the component owns everything after that.

`groupDate()` (`common/barchartData.ts`) pivots them into a dense `BarchartTable` (`group × date`):
dates densified by walking `PlainDate.iterateToDate` so a gap is a real column, series sorted by
total, and cells before a series' first data point `null` so a line starts where its data does.
`convertToCumulative()`, `convertToShare()` and `convertToRanking()` are pure transforms over that
matrix, so one `View` control (`Totals` · `Share` · `Cumulative` · `Rank`, words through
`SegmentedControl`) owns all four: they are views of one pivot rather than four independent choices.
`Share` divides each cell by its own column's total, an empty column yielding zero cells rather than
`NaN` reaching a series, and always over the raw measure rather than through `postAggregate` — two
callers pass a flooring minutes-to-hours conversion, and the share of floored values is not the
share of the values behind them. `Rank` ranks the measure `Totals` plots and keeps it as its tooltip
figure, so the axis plots position while the hover card states the number. Clicking a column
isolates that series and clicking again restores all, through Highcharts' plot-options event rather
than React state, and an empty pivot is refused outright, Highcharts inventing an index axis and a
series of its own from nothing.

`groupDate` sorts groups ascending so `reversedStacks` — on by default — puts the biggest at the
foot of the stack, where a stack is read from, and the legend is reversed to match. Height is the
resolution of a magnitude, so the three views that plot one take the full height; `Rank` needs only
a lane per series and takes `min(height, max(320px, groups × 44px))`. That height is `60vh` on a
phone and `80vh` above it (`useStackedCharts`): a chart opened deliberately, with the library still
to come below it, reads at one thumb-flick rather than two. Callers choose the measure and pass
`postAggregate`, a scalar applied after aggregation — `show/` turns accumulated minutes into hours
with it — scalar so that a caller cannot couple to the pivot's shape, which the shell traverses.

Folded on a phone (`FoldedChart`, below), the card states its Totals reading as one line and a
sparkline: `barchartSummary` names the fullest column and, past two groups, who led most of them;
`columnTotals` is what the sparkline plots and `Share` divides by. Both run over `raw` in three
views out of four — under Cumulative, whose pivot buckets a climbing total by month, the fold
re-pivots `data(false)` so the summary names a peak by month rather than the running total that is
highest on its last column by construction, with `postAggregate` applied again so a folded Shows
card states hours and not accumulated minutes. The words are built in `Barchart.tsx` rather than
`barchartData.ts`, since `format` is an `Intl.NumberFormat` on the reader's locale and a pure data
module has to stay one a locale cannot change.

### Sunburst — `common/Sunburst.tsx`

An arbitrary-depth hierarchy from a flat list. `generateSunburstData` (`common/sunburstData.ts`)
builds path-style ids (`"-Nintendo-Switch-Zelda"`) and accumulates values into a `Map`, which makes
grouping order fully dynamic: the caller passes `groups: K[]` and `SunBurstControls` renders one
select per level, so a reader re-nests at runtime — one labelled row, "Nest by" then the rings
joined by `›`, humanised through `keyLabel` (`utils/stringUtils.ts`). Domain meaning enters through
four callbacks: `keyToVal`, `getCount`, `getColor`, `getLeafName`. `ringOptions` takes a chosen key
out of the other menus, a key held twice dividing every wedge into one child of the same name,
unless that would leave a menu holding only the value it shows.

The chart is keyed on the grouping and a rebuild counter, so a re-nest replaces it rather than
updating in place: `chart.update` matches incoming nodes to existing points by position, and
rewriting every id below the first ring draws the new tree at the old one's angles, a fan with gaps
in it. The same ids filtered, or at new values, update faithfully and keep their animation. A drill
is held with the grouping it was made under, so a re-nest reads as no drill, and the series states
its `rootId` from the data each render (`sunburstRoot`), answering the top where the drilled id
names no node: `SunburstSeries.translate` reads that node's `parent` unchecked and throws. A layout
effect clears the id in that case and bumps the counter, since the trail and the drilled geometry
live in the chart instance.

Depth follows the data — the leaf ring is `groups.length + 1`, so a select box added in a domain
file changes the rings without touching `common/`. At the top that ring is collapsed (`levelSize`
zero, labels off) and drawn only once the reader drills in, where `dimLeafRing` fades it so leaves
read as detail rather than structure. That callback is at module scope because Highcharts binds the
chart to `this`, which opts a component out of the React Compiler silently (§7). Beside the barchart
the card stands at `min(80vh, 700px)`, a circle's diameter being capped by its half-width column;
stacked below it instead (`useStackedCharts`) the width _is_ the column, so the cap follows the
viewport down to a floor of `min(100vw - 64px, 480px)` rather than wrapping a 340px wheel in 400px
of blank paper.

Folded on a phone, the card states `firstRing` — the innermost ring, largest first, off the same
`parent === ""` test that collapses the leaf ring — as a line of names and figures and a
`ProportionalBar` (`RingBar`) built through the Top lists' own `topNWithOther`, so wedges beyond the
fifth become one "Other" segment. A grouping with a colour vocabulary keeps the wheel's own hex; one
without falls back to a series colour by rank, which can disagree with Highcharts' own `colorByPoint`
order — the names under the bar say which segment is which regardless. `SunBurstControls`' "Nest by"
label drops below `sm`: at 390px the card is 324px and a word plus three chevron selects wants 379,
so the label is the one a reader can infer back from the values it precedes.

### Timeline — `common/Timeline.tsx`

Hand-rolled SVG rather than Highcharts, because what is wanted is a Gantt-like packed timeline with
rich hover cards. Two algorithms:

- **Greedy interval packing** (`packRows`, `common/timelineLayout.ts`): sort by start date, place
  each item in the first row whose last item has ended. Items are linked to their row neighbours
  (`previousDate` / `nextDate`), so the layout step knows how much empty space surrounds a bar.
- **Measured text placement** (`useTextPlacement`): a `useLayoutEffect` reads real DOM geometry and
  decides per item whether the label fits inside the bar or spills into the gap left or right,
  tracking per row whether the right-hand gap is claimed. Labels live in a `<foreignObject>`
  spanning the whole gap, so they overflow the bar without being clipped. It re-measures on a resize
  — width only, every placement number being a pixel off a grid whose width alone moves it — after
  dropping to the empty layout, so no label is measured wearing the previous width's placement.

The chart is fixed at `400vw` inside a scroll container, the month/quarter/year axis beneath it.
`buildTicks` walks the month range once in `TimeLineChart`, and that one array feeds the axis,
`TimelineBackground` — alternating year bands and gridlines behind the bars — and `yearMarkers`,
which folds it to one entry per calendar year, the opening one pinned to the left edge because a
chart rarely starts in January. One array because on a 22-row chart the axis is several hundred
pixels below the top row: a gridline a pixel off its own label misreads every bar above it. The
background is the `svg`'s first child, SVG painting in document order, and `pointer-events: none` so
full-height rects do not take the pointer across the chart.

The chips are a scale over the scroll range rather than anchors on the grid, and `percentAtScroll` /
`scrollAtPercent` own both directions. Four viewports of width force that: `scrollLeft` stops at
`scrollWidth - clientWidth`, three quarters of the grid, so a marker's own percentage read as a
fraction of `scrollWidth` leaves the last quarter of the years unreachable, every chip in it
clamping to the same edge. Mapping the marker span linearly onto the reachable range makes the two
directions inverses, at the cost of exact alignment. The highlight is the year last scrolled to,
read back through the current markers, so a filter cannot leave a chip naming a year the chart
lacks; unscrolled it reads as the latest year, where `useOpenAtLatest` opens the chart, keyed on
whether there is data at all.

**React holds a year and nothing else.** The `onScroll` handler reads the offset as the year it
lands in, so hundreds of events per drag settle to one state change per year crossed and a set to
the value already held costs no render, where the raw offset re-renders the chart every frame — the
reason an edge fade computed per frame is the expensive way to say "there is more". Static CSS says
most of it instead: the container styles its own scrollbar (`scrollbarSx`), opting macOS out of
overlay scrollbars that hide the moment scrolling stops, so a thumb a quarter of the track long
states both that there is more and how much. iOS draws no scrollbar at all, styled or not, so the
chart also carries a `ScrollFade` (`useScrollEdges` on the same ref the year chips drive) — the one
surface here running both, since only this chart is read on a platform where neither answer is
guaranteed to be the one drawn. `CONTAIN_SIDEWAYS_SCROLL` keeps the chart's own flick from carrying
into the browser's back gesture
at either end.

The chart caps its height and scrolls vertically within the card from `md` up
(`CHART_MAX_HEIGHT`), a packed timeline running to dozens of rows; below it the cap lifts and the
grid stands at whatever height `packRows` gives it, since a second scroller inside a page that
already scrolls takes the drag meant for the page. Alone among the app's charts it never folds —
`show/Timeline.tsx`, `vg/Timeline.tsx` and `books/Timeline.tsx` draw it through a plain
`SectionHeader` and `Card` — since a folded card would show only a picture of a Gantt chart's shape,
no cheaper a reading than the chart itself.

The hover card that names a bar reaches it two ways: through the label, which already re-enables
its own pointer events, and through the bar's own `rect`, so a finger aimed at the item and not at a
label sitting in the gap beside it still lands on something. `useCoarsePointer` is read once per
chart in `TimelineGrid` and passed down as `coarse`, rather than mounted per mark — a few hundred
marks would otherwise be a few hundred subscriptions answering one question that cannot differ
between them (§ Phone and tablet). The row's own `&:hover` scale sits behind `(hover: hover)`, as
every bare hover rule here does: a tap has no leave event, so the last bar touched would
otherwise stay scaled up until another tap lands elsewhere, reading as a selection the chart never
made.

Two details are load-bearing. The label `Box` sets `lineHeight` to `BAR_HEIGHT`, being `position:
fixed` with no `top` and so centred by its own line box alone: a bar height changed without it puts
every label off-centre. And the hover step on a bar is instant — a CSS transition there is created
but its clock never advances, the tooltip opening re-rendering the row and restarting it every
frame.

### Event ribbon — `common/EventRibbon.tsx`

A stack of tracks on one shared scale, for events that are points in time rather than spans: the
caller fixes the rows and only the marks move. The packed timeline cannot hold points, `assignRows`
freeing a row the moment a span ends, so a library of them packs into one row of a chart four
viewports wide. Movies is the caller (`movie/WatchTimeline.tsx`): one row per calendar year on a
shared 1 January – 31 December scale, so density within a year and seasonality across years both
read at a glance. Its ticks are built once over a non-leap 2001, every row being twelve months, and
that array feeds every row's gridlines and the single axis beneath the stack. The marks are
`buildStrip`'s point handling — a single day floors to the minimum band width, and films watched
days apart tile clear of one another inside the lane — with hover cards through
`common/LazyTooltip`, so hundreds of marks build only the handful actually hovered. The ribbon owns
no `Card` of its own: `WatchTimeline` stands it inside a `FoldedChart`, whose folded state is a
line naming the busiest row and how many years the stack draws — the one figure a dozen identical
twelve-month rows have to summarise with, where the barchart's sparkline or the sunburst's first
ring have a shape to draw instead.

### Omnibus — `omnibus/`

Every surface of the composing domain is a `common/` shell fed the union (`OmniItem[]`) instead of
one medium's rows, so the page speaks the four tabs' own vocabulary rather than inventing a
mixed-media one.

**The Now band** (`omnibus/Stats.tsx`) is what no single tab can show: what each medium is currently
on, side by side. `electNow` reuses each domain's own election — `currentlyPlaying`,
`heroSeason(currentlyWatching(...))`, `latestWatched`, `currentlyReading` — so a card cannot
disagree with the hero its home tab shows, and its `visible` record keeps a medium switched off in
the filter drawer from headlining. A medium with nothing in flight contributes no card; with none in
flight, no band.

The composing layer supplies the ground under each card's own `TypedCardMediaImage`: `barColour`
(`src/tabs.ts`) — a tab's primary on the light paper, its 22% `darkBar.tint` on the dark — arrives
as `chromeColour` and paints the collapsed card alone, naming the medium in place of a chip over the
artwork, since four sampled colours say nothing about which tab a card came from. `colour`, given or
sampled, paints the expanded card, where the picture is the whole first screen.

Games and Movies hold 16:9 banners, Shows posters and Books covers: two banners, a poster and a
cover. Every card is one width (`omnibus/nowGeometry.ts`) — a full-height poster at 680×1000 plus a
176px text column, 434px — spent differently by each shape: a poster's picture takes the row's 380px
height with the words beside it; a banner's spans the card, so the width fixes its height at 16:9
(244px) and its panel gets the 136 left. No two covers share a ratio, so a cover is a poster card
pinned on the height alone: `shapeIsExact` (`common/cardArrangement.ts`) makes 2:3 a reservation and
never a size, the column absorbing whatever width the file has.

Four cards at 434 need 1,760px where the widest container gives 1,488, so with all four in flight
the row is measured (`common/useElementWidth.ts`) and shared four ways (`denseNowGeometry`): the
banner's panel keeps its 136 exactly, the row's height following from its picture. The share floors
at 366, a poster's column 133px, the narrowest a date, a two-line title and two tiles read well in;
under it the four seat two and two, the row held to two cards' width so the third wraps. The words'
height is never measured, since deriving the banner's width from however tall its words turn out
needs a loop that settles; that budget costs a panel which cannot grow, so the title clamps to one
line rather than letterboxing the picture. `statSize="compact"` and a halved panel inset fit a
kicker, a title, a subtitle and a figure into 136, spent on every card because the row is read
across its figures. `inlineKicker` is the two banner cards' alone: at 402px the date and platform
take the two ends of one line, where the 176px column wraps them to four.

On a phone the band is a grid of two by two rather than four cards, and each cell is a picture and a
date and nothing else: a card that fills the width is as tall as its own artwork, and four full-bleed
pictures would put the last of them two and a half screens down, where four rows short enough to
share a screen leave a poster 54px wide. The rows pair by shape — the two banners first, the poster
and the cover under them — so a row shares a height, which is why `Now` reads `usePhone` as a value:
the pairing is a DOM order, which no `sx` can state. A banner spans its cell at 16:9 with the date on
a line beneath; a poster or a cover stands beside a 36px spine (`NOW_SPINE_WIDTH`, `nowGeometry.ts`)
with the date set down it as a book's spine is. That row is one height, the poster's at the width
the spine leaves it, solved from the measured row (`nowPortraitHeight` — 204px at 390, 234 at 430),
so a wider phone gets a taller picture rather than ground beside one; the cover, whose ratio no file
holds exactly, is held to the same height and takes its own width inside it, its spine absorbing
the few pixels a cover off 2:3 does not fill, so nothing is cropped and the two cells stay level.
A column that narrow holds a date and not a word, and the date is the one fact of
the four a picture cannot carry; the platform, the genre and the figures are one tap away on the
expanded card, which the whole cell opens (`openFromCell`), a finger on the spine doing what a finger
on the picture does. A banner alone in flight takes the whole row, half of it beside a gap being a
98px picture. Between `sm` and `md` the cards return two to a row, the share solved from the measured
width as the four-way one is (`pairNowGeometry`), since the stated 434px card is wider than half a
tablet's page.

**Mixed rows are one card size, the Now band's rule at strip scale.** A list lays its cards out one
of two ways (`CardLayout` in `common/Stats.tsx`): a grid at stated column spans, or a sized row.
Recently Finished and the gallery's drill-downs take the second, handing the shell a `rowSizing`
(`MIXED_CARD_SIZING` in `omnibus/cardData.ts`) in place of spans — a union rather than two optional
props, so a sized row is never handed spans it cannot read. The caller states only what it knows: a
minimum width of 280, a 206px poster beside a 140px column wide enough for a date and a two-line
title, and the picture's height at a width, the banner's. The shell adds the medium band, the
one-line footer under a banner (`ROW_FOOTER_HEIGHT`, 65, on the card's `rowSize`) and the border,
then measures the row and shares it between as many cards as fit (`common/rowSizing.ts`) so a whole
number fill it — measured rather than stated at breakpoints, because the drill-down dialog spans the
viewport.

That band names the medium along the top of the whole card (`CardMediaImageProps.mediaBand`), the
card's first child, rather than a chip covering the artwork; on a row-laid card it takes a line of
its own and adds no width to the picture and words under it. `omnibus/mediumBand.tsx` builds it once
per list at a stated `MEDIUM_LABEL_HEIGHT` of 22, so the shelves, their drill-downs and Recently
Finished cannot draw it at different heights — stated because those surfaces fix a card's height and
the artwork takes the rest.

**Recently Finished** (`omnibus/RecentlyFinished.tsx`) is the list each tab keeps for itself, asked
once across all four: `recentlyFinished` keeps only items with a `closeDate`, since an item in
progress is not finished — and that filter leaves every entry with a date to sort by, where
`sortByKey` puts falsy values first in both directions. Its cap is stated in rows (`collapsedRows`,
two), since how many a sized row holds follows from the measured width. The library wall
(`common/Finished`) is not reached from the union; see §10.

**By year** (`omnibus/Barchart.tsx`, `omnibus/barchartData.ts`) is the union on a time axis, split
by medium, genre or certificate. Medium is what the page opens on, but four series is a bar in a few
pieces and a bump chart of four flat lines, where a dozen genres or five certificates is the shape
Share and Rank were built for. Franchise is not offered — 115 series and a legend longer than the
chart — nor decade, derived from the year and so putting each series in one run of columns with
nothing crossing. Genre and certificate are asked of `galleryValue` and coloured through
`galleryColour`, so chart and shelves cannot disagree about what a genre is or which certificates
are one tier. The date is a whole year in every view including Cumulative: an item's
year is an attribution, and only a film's is a date the sheet holds. A row whose split column is
empty is dropped rather than opening a series named `""` — every book answers the certificate split
that way — and the header counts the rows drawn.

**The gallery** (`omnibus/Gallery.tsx`, `omnibus/galleryData.ts`) shelves the union by genre,
franchise, rating or decade, each shelf a `common/Filmstrip` with a drill-down behind its handle. It
opens on franchise, newest first — the series met lately, which the genres band does not answer. A
shelf card carries no words, so the picture keeps the whole height below its medium band.
Every category but rating is a field all four media record — `groupByCategory` skips an empty value,
so a category one medium answers `""` to drops that medium off the wall with no error. Rating is the
exception: nothing certifies a book, so books are absent from the rating shelves and the certificate
split rather than shelved under a certificate nobody issued. It groups on `ageRatingBand` and not
the cell, or a PEGI 16 game would shelve apart from the BBFC 15 film at the same age. "Decade" is
the decade the reader _met_ the item — Shows carries no release date anywhere in its model — hence
the header "Decade Met". A franchise shelf holding one work is dropped on the shared
`realFranchisesOnly` rule, the column being mostly works naming themselves.

The section is an `ExpandableCard`: six shelves collapsed, twenty-five expanded, `EXPANDED_CARDS /
PICTURES_SHOWN` — a picture budget, the drill-down dialog's own, rather than a shelf count, which
keeps the categories comparable since franchise yields 115 shelves against genre's 12 and an
uncapped expansion would mount over two thousand cards on one and a couple of hundred on the others.
One control orders both the shelves and the pictures on them, and the shelves are cut _after_ the
sort, so the six are the six biggest or the six most recent rather than the recent among the
biggest. Recency is a `metDate` and not the `year` an item carries: twelve genres over a library
this size nearly all hold something from the current year, leaving almost every shelf tied. It rides
beside `year` rather than over it, because the decade category reads `year` and a show whose seasons
closed in two decades stands once on each shelf — written over, both copies would claim the later
one. Works are collapsed per shelf with the biggest entry as representative, dated by the last entry
collapsed in; an item with no close is dated today.

**Genres by medium** (`omnibus/GenreBridge.tsx`, `omnibus/genreBridgeData.ts`) asks the composition
question of genres: one proportional bar per genre, split by how its hours divide between the four
media. Hours rather than the page's measure: under Items a two-hour film weighs the same as a
hundred-hour game, so the bar would call a genre mostly films whenever the films are short. Only the
primary genre counts, since two media carry secondaries. A genre held by one medium is a solid bar
rather than held back until a second arrives — requiring the crossing puts a cliff in the section,
Abstract being 136 hours of games that a single abstract film would admit at full size — and the bar
states the confinement the cliff was hiding. A genre whose every entry logged nothing is dropped; a
medium contributing no hours gets no segment, because `assignPercents` floors every slice at half a
percent and a visible slice of nothing is a claim the data does not make. The hover dim is one piece
of state for the whole card, turning a stack of bars into a comparison read down the column, and is
optional on both `ProportionalBar` and a genre's own row for the same reason: folded on a phone, the
card states its biggest genre by name, hours and media count, drawing that one row as the fold's
preview, with nothing to dim it against.

**Franchises over time** (`omnibus/crossingsData.ts`, `omnibus/Crossings.tsx`) draws each franchise
met as a strip, one lane per medium present, packed by `common/timelineStripData`'s `buildStrip` as
a show's season strip is, so the two cannot disagree about what counts as an overlap. Lanes are
absolute: each medium is packed on its own and offset past the lanes already spent, so a renderer
never works out where a medium's rows begin. Reaching a second medium is not asked of a franchise,
that cliff hiding the largest series on the page — thirty seasons of Doctor Who behind the absence
of a Doctor Who game. The twelve biggest are drawn (`STRIPS_SHOWN`), the header stating the full
count. A franchise groups on the raw franchise column, as `movieFranchise`/`showFranchise` do, so a
series' founding entry keeps naming itself as its own tab draws it; `namesTheSameThing` drops a group
where _every_ entry repeats the name, that group having no series structure to draw a lane for. That
one test holds the section to series: 588 franchise values are 169 series by it. A film is a point
(`start === end`), floored to the strip's minimum band width; a bare-year game date draws its whole
year, marked `precise: false`, rather than the share `vg/cardData.ts` estimates from the whole
library for a single game's strip. The `epoch` is the earliest _start_ drawn, floored to that year's
1 January: an attribution year is the year an item ended, so a scale opened on it clamps every
earlier start against the left edge, and a mid-month epoch puts every year line off by the
difference.

Folded on a phone, the section states its largest franchise — `crossings[0]`, the strips being
ordered by size — by name, entry count and media spanned; a stack this wide has no single shape a
preview picture could stand in for. The stack itself splits into its own `CrossingsStack`, mounted
only once the card is opened, because `useOpenAtLatest` fires once for a library that has data:
mounted with the folded card it would find no scroller on that one run and open at the epoch, the
oldest end of a scale whose whole point is the newest.

Every strip is handed one tick array, built once by `Graphs`, so the section states its years once
beneath the stack — `TimelineCard` takes `inStack` and `TimelineAxis` is exported for it. A
per-strip axis on a shared scale is one row of labels drawn twelve times, a quarter of the section's
height restating a scale that cannot vary. The stack is drawn at three times its container's width
in one scroller: a quarter of a century across one screen gives a year about fifty pixels, and
Marvel puts fifty-one entries on it, a dozen inside two years at a minimum mark width of six, so the
marks read as a texture rather than as dates. Three rather than the timeline's four, since this is a
stack of twelve where that chart is one row of bars, and every viewport of scroll is paid for twelve
times over. One scroller keeps the shared scale true, and it opens at the most recent end. The
franchise names are `position: sticky` inside it, which needs `Card`'s clipping opened: a sticky
element travels with the nearest scrolling ancestor.

`common/useScrollEdges.ts` tells a reader those rows scroll. Two hide their scrollbar — the section
rail, where a bar under a row of chips costs as much height as the row, and the gallery's shelves,
where the strip reserves room for one the platform declines to draw: macOS Chrome's overlay
scrollbars appear only while scrolling, and neither `scrollbar-width` nor `::-webkit-scrollbar` opts
out, leaving `offsetHeight - clientHeight` at zero, so a shelf of twenty pictures shows six with
only the cut-off sixth to say so. The hook measures which ends have content past them, with a pixel
of slack at each because `scrollLeft` is fractional under a non-integral device pixel ratio, and
re-reads after every render rather than observing the children it had at mount — a filter that
replaces a shelf's pictures leaves the strip mounted, so an observer bound to that first set watches
nodes that have left the row.

`common/ScrollFade.tsx` paints the answer as absolutely positioned overlays in a wrapper around the
scroller, because nothing on the scroller can: a background or inset shadow is painted before its
children and tints only the gaps between marks, and a mask takes the element's own background with
it. The wrapper is what a caller pins, paints and hands a ref to; each passes its own ground, and
anything pinned inside the scroller is lifted above `FADE_Z`, where the crossings' franchise names
sit.

`common/Filmstrip.tsx` is the layout the gallery and Recently Finished stand on: a row of artwork at
one fixed height, each child keeping its own width, scrolled rather than wrapped or cropped. Height
is the only dimension it fixes, which lets a banner, a poster and a cover share one row uncropped —
a grid cell has a width, and a width plus a height is a crop. It states that height on its children,
since 100% of the strip's box is the row plus the ten pixels reserved for its scrollbar, through a
doubled selector (`&& > *`) that outweighs the card's own one-class rule about the same property.

`omnibus/CardMediaImage.tsx` is the `TypedCardMediaImage<OmniItem>` every one of these surfaces
renders through: it dispatches `item.source` by `item.medium` and passes `mediumToShape` down, so a
picture opens that domain's real expanded card, strip and ledger, and only this tab's mixed rows
arrange themselves per item. `OmniHoverCard` beside it dispatches the same four ways, so a hovered
mark shows the card its home tab would show rather than a fifth assembly of one.

### One control idiom for "how is this drawn" — `SegmentedControl`

`common/SelectionComponents.tsx` exports one control for a small closed set of named states, and
every surface offering one uses it: the barchart's four views, the gallery's shelf order, the wall's
density, the Shows timeline's Seasons · Shows, and each tab's measure in the section rail — the last
through `MeasureControl`, which owns the wiring to the filter reducer once for the five tabs. Values
that are already their own words become options through `common/segments.ts`. Words rather than
icons, an icon being a legend nothing on the page teaches.

It is always `size="small"` at 12px, or one control would read as two between a card header and the
22px chip rail, and a press on the lit segment is ignored rather than clearing it. The franchise
strip's Order · Time switch passes a `tone` — `SegmentTone`, the artwork palette's `ground`,
`onGround`, `line` and `tile` — because the theme's primary is solved against the theme's paper and
on a sampled ground can land a hue away from legible: toned, the lit segment takes the surface's ink
with its word in the ground, and the unlit words that same ink at full strength, the muted tone
being a transparent ink too close to a mid-toned ground for a 12px word to carry. `SelectBox` takes
an optional `labelFor` where a caller's options are model keys, with `textTransform: none` on the
select and again on every item, which the portalled menu cannot inherit.

### Filter drawer, Top lists and drill-down — shared shells

`common/FilterDrawer` is two different trees on `usePhone`, not one tree at two sizes: from `sm` up a
floating button opens a `Drawer` that stays out of the page's way, `variant="persistent"` so it
never covers the chart it is narrowing; below it the button is a chip in the section rail's
`trailing` slot (`FilterChip`) and the drawer is a modal `SwipeableDrawer` sheet, opened by that
chip alone (`disableSwipeToOpen`, `disableDiscovery` — the bottom edge of a phone is the home
gesture's). Both read `common/filterSheet.ts`, a store outside React rather than a context: the chip
lives in the rail, which a domain's `Graphs` renders, and the drawer is a sibling of the whole chart
tree, so lifting the open flag to their nearest common ancestor would sit it above every chart and
re-render all of them on an open the flag never reaches. `FilterToggle` reads which tree it is in
through a `SheetContext` set by the drawer itself, since the slot handing it down as a child cannot
otherwise tell — a switch under a wrapped label, three to a row, on desktop; a third-height filled or
outlined chip in the sheet. `FilterCategory` is unchanged either way. The button carries a badge
counting the fields the reader has changed (`activeCount`, from `createFilterReducer`): every chart
is drawn through the drawer, so a library narrowed to one franchise otherwise looks exactly like the
whole library.

`common/DrilldownDialog` and `ExpandableCard`'s own dialog (below) both take an `onClose`, so Escape
and a backdrop press close them like any other dialog; the header button stays, since a fullscreen
dialog covers the handle that opened it. Below `sm` `DrilldownDialog`'s header sticks to the top
(`stickySheetHeader`) rather than scrolling with a grid five hundred cards deep, and swaps its
arrows-in icon for a ✕ — the sheet's own word for leaving, where the arrows would read as "back to
the card this came out of".

`common/TopList` exports `TopCategoryBand`, the row of "Top X" cards a tab opens on. The card owns
what is the same everywhere: the category select, `topNWithOther`'s top-five-plus-Other reduction
(`common/statsData`), the proportional bar with its ranked legend and shared hover dim, and the
colour policy — "Other" is the neutral bucket, a group whose domain has a vocabulary wears it, and
one without takes a palette colour offset by the option's index, so switching category recolours
consistently. A domain supplies its option list, whose order feeds that offset, an icon per option,
how to group, and its vocabularies.

`common/GroupedStatList` is the strip of grouped cards that drills into a group. It owns the open
handle, the expand badge that sets it, and the drill-down's card keys, which the category prefixes
so a change of grouping remounts the grid; it sorts the picked group at open rather than every
category on every render, and mounts `common/DrilldownDialog`, the fullscreen list itself, only
while a group is picked. The franchise machinery is shared the same way: `common/franchiseIndex`
groups by whatever accessor a domain passes, and `common/franchiseContext`'s factory threads the
index down to the card strips.

### Franchise strip — `common/FranchiseStrip.tsx`

Every entry of an item's franchise the reader has met, across all four media, with the card's own
item singled out. A `StripVariant` says where it stands: an expanded card's strip offers two
readings and a switch between them, while the hero's is held to the first with no switch and is
drawn only where its hero has room for it, a rule the hero states by shape so that a page narrowing
never shows the strip, drops it and shows it again: beside a poster or a cover from `sm` up, the
phone's 154px panel beside a 300px poster spending its height on the title; beside a banner from `lg` up, the panel being
258px at `sm` and, between `md` and `lg`, a column the title wraps in, where a wrapped title over a
strip outgrows the picture.

**Order** is the default: one bead per entry in the order met, evenly spaced whatever the dates
between, the year beneath only where it changes and no range in the caption, since the beads are the
order and the years say when. Dropping time from the axis keeps a bead the same size on a
fifty-entry franchise as on a five-entry one. Past a minimum pitch of 28px the card's chain wraps
like a line of text, each row's line stopping at its first and last bead; the hero's `fit="shrink"`
keeps one row instead, closing the beads up to a floor of 6px with the years then stated only at the
two ends.

**Time** draws the same entries against a window of the franchise's own years — `stripWindow`, the
January of the first start to the December of the last end, held open to three years — with the
fixed epoch–today scale bracketed on a thin bar beneath so cards stay comparable, `TimelineScale`
drawing the gridlines and `yearLabelEvery` thinning the labels to every second or fifth year as the
window grows. Lanes open only where entries genuinely overlap, never per medium — which medium a
mark belongs to is its fill — at a fixed 16px pitch, so the strip grows to hold its lanes and no
band shrinks to fit. A film is a point (`start === end`) drawn as a dot, a bar floored to a
percentage of the width being a different number of pixels on every card; an imprecise span
dissolves at both ends under a mask. The chosen reading is held at module scope, so it carries from
card to card for the life of the page.

Both readings stand in a well: a wash of the card's own ground edged in its hairline, so the strip
reads as part of the card rather than as a paper plate inside one the artwork has coloured. The well
gives up the contract — a medium's fill on an artwork tint is no pair the tables checked — so every
mark carries a hairline ring in the card's line tone and is legible by its shape whatever the fill
lands on. Each part reads `useArtworkPalette()` for itself.

Marks wear the medium's fill and nothing more, the platform, status or genre a strip could colour by
being stated in the ledger below it. A `Mark` has four levels: `focus`, the entry the card is about,
ringed with a gap of the ground and then the ink; `subject`, another entry of the same subject —
another season of the card's show — ringed solid in the ink, so the two read as kin and one as the
point; `plain`, that same subject where the strip holds nothing to stand apart from, a ring on every
season of a lone show marking nothing; and `none`, context, stepped back to 0.75. The ring is in the
ink because it means "this one" and nothing else, and no mark is named — a name covers its
neighbours on a chain of fifty, and the hover card names any mark for the asking. The caption
carries `FranchiseName`, the franchise with the swatch its Top list and ledger rows wear, exported
so the crossings name theirs the same way, then each medium present counted through `mediumUnit` in
its own fill.

A bead or a mark is a fraction of the finger that has to land on it — an 8px bead, a 5×7px mark —
so each carries an invisible hit box under a coarse pointer alone (`touchTargetSx`,
`common/touchTarget.ts`), stated as a height because widening one to the platform's own 24px would
reach over its neighbours on a chain of fifty and hand every overlap to the later sibling. A bead's
box is the full 24; a Time-reading mark's is the 16px lane pitch it stands in, since a taller one
would reach into the lane below and answer for both marks at once.

The entries come from one index across the four libraries. `common/franchiseUnion.ts` declares the
`FranchiseEntry` shape — key, subject, franchise, medium, fill, label, span, `precise` and a
hover-card thunk — and the context; `omnibus/franchiseUnionData.ts` builds it, mapping each
`OmniItem` through its own domain's `gameEntry`, `seasonEntry`, `movieEntry` or `bookEntry`, so the
union and a tab's own index cannot draw one item two ways. A tracked domain may not import another
and `common/` may import none, so the build sits beside the Omnibus adapter and its provider
(`omnibus/franchiseUnion.tsx`) is mounted by `Google.tsx` above the outlet. It calls `useData` with
the four domain configs and applies guest mode per library by each domain's own rule; the
module-level cache means a session that opened on the Omnibus reaches a home tab with nothing left
to fetch, and only a deep link straight to one pays three extra sheet reads. Until all four land the
value is `undefined` and a card falls back to the strip its own index draws. The union groups on the
raw franchise column exactly as the per-domain indexes do, and does not apply the crossings' rule
dropping a group whose every entry repeats the name: that rule chooses which franchises a section
draws at all, and a card has already chosen. The hover card behind each mark is the Omnibus's own
dispatcher, loaded lazily with the chunk that draws it and prefetched on mount, since a tooltip is
positioned once when it opens.

### Card strip data — `common/timelineStripData.ts`

The proportional-scale arithmetic the card strip's Time reading, the crossings stack and the Movies
ribbon share. `buildStrip(spans, epoch, today)` places each span on that fixed scale and returns it
as a `startPercent`, a `widthPercent` and a `lane` alongside the caller's own fields, so a domain
never has to key its records back out of the result. A day over two decades is a fraction of a
pixel, so every width is floored at half a percent.

Bands are positioned rather than chained: chaining gaps and bars turns an overlap — which a
franchise produces routinely — into a negative gap that drifts every later bar, and lets that floor
push the total past 100% so flex shrink distorts all of them. Overlapping spans take separate lanes,
a band drawn over another hiding it completely and taking the pointer with it. Only a genuine
overlap opens one: a span abutting the one before it stays in its lane and is tiled clear instead,
since a lane costs every band in the strip a share of its height.

Both rules are date-based and shared with the full timeline through `assignRows`
(`common/timelineLayout.ts`), so the two charts cannot disagree about what counts as an overlap, and
the year gridlines come from that module's `buildTicks` for the same reason. `buildTicks`,
`buildStrip` and the full timeline's bars all take their offset from `percentAtDate` — the days
elapsed before a date — so a tick and a band opening on the same day land on the same percent, and
their width from `percentOfSpan`.

`TimelineCard` in `common/Card.tsx` is the renderer the crossings stack uses, taking bands and ticks
rather than nodes: the shell owns the coordinate space, so a caller reads `startPercent` and
`widthPercent` and never asks how they were arrived at, and orientation lives there — percentages
know nothing about which axis they will be drawn on. The card's own strip uses the same arithmetic
with its own marks: a fixed lane pitch, a dot for a point and a ring for the subject, none of which
a stack of twelve strips on one scroller has room for.

Every band `TimelineCard` and `EventRibbon` draw is a `TimelineBandBox`, which carries the same
lane-aware hit box the franchise strip's own marks do: the full 24px reach on a single-lane track, a
percentage of the band's own box on a multi-lane one, computed against the lane's padding so it
follows a strip of any height without the box knowing what that height is — emotion mints a class
per distinct value set, and a crossings stack draws hundreds of bands to share one between.

### The expanded card — `HeroStatRow` and `MetadataLedger`

`CardDetailBody` (`common/Card.tsx`) composes an opened card's body. The franchise strip comes
first, bare rather than in a grid row: a domain's strip renders nothing for a standalone item, and a
row around nothing still takes the grid's spacing. Below it the facts are two tiers rather than one
uniform grid of tiles, a grid giving a game's publisher the same weight as its hours.

`HeroStatRow` is the figures — a game's hours and days to beat, a show's episodes and hours — laid
out by `StatTileGrid` at the `hero` size, and nothing at all for an empty list. `StatTile` paints
its own ground where the field has a colour: status is a fill in every chart on the tab, so the
status tile is that fill with `getContrastText` type, the rule a card's corner chip follows.

`MetadataLedger` is everything else, as label/value lines in two CSS columns at `md` and one below.
Columns rather than a grid because the rows are independent: a grid holds each pair to the tallest
row on it, so a value that wraps opens a gap beside it. Related facts share a line, which keeps the
ledger to a third of the height the tiles took, and a row carries a colour swatch exactly where the
app already speaks that field's colour elsewhere — platform, franchise, genre, rating, status, and
nothing else, a swatch with no vocabulary behind it teaching a legend no chart honours.

Both shells take plain `{ label, value, … }` arrays, so `common/` never learns what a PEGI rating
is: the four domain `CardMediaImage.tsx` files build them and choose the omissions, a tile reading
zero because the sheet recorded nothing saying something false. `LedgerList` is exported for a
surface that seats those rows itself, and `DetailCard`, the uniform tile, for a domain with too few
facts for the split to buy anything.

Below `sm` the dialog is a sheet: the card stands at a minimum `100svh` and carries a `SheetBar` —
a grabber, the item's own name and a ✕, 48px tall (`SHEET_BAR_HEIGHT`) — as its first child, sticky
above the artwork on the artwork's own ground rather than the paper's, so the name and the way out
survive the scroll a full-bleed picture invites. The name is stated at every scroll position rather
than faded in, since a bar that fills in as you scroll reads as something loading rather than as
chrome that was there from the start. `pinnedSheetTop` (`common/fullscreenSheet.ts`) is the sticky
recipe every sheet bar in the app shares — this one, the filter sheet's, a hover card's — pinning at
the top with the notch paid for above the bar's own content; the dialog's `Paper` and `Card` both
open their `overflow` to `visible` at this width, since either being anything else becomes the
scrollport a sticky element measures itself against. The artwork below reads its own room off two
custom properties, `--sheet-room-width` and `--sheet-room-height` — `100vw` and `100svh` less the
bar, the top inset below `sm` and the dialog's 32px frame — so the width and the height a `min()`
picks between are always the two halves of one room rather than two breakpoints that could move
independently.

`CardPanel`'s `hero-aside` layout is what `common/Hero.tsx` asks for wherever its own shape already
stands beside its words — a poster (Shows) or a cover (Books) — rather than `hero`'s beneath-below-
`md`, above-`md`-beside split: those two shapes never stack under their artwork in the first place,
so the seam is the vertical edge at every width instead of switching with the arrangement. Below `sm`
its panel also gives back part of the standard inset and steps its title down a size — beside a
136px poster on a 358px card the panel is 222px and the standard inset spends 32 of them, so the
four pixels a side given back are the difference between a two-line title and a three-line one.

### Scroll marker — `common/ScrollMarkerHook.ts`

The library grids run hundreds of cards deep with nothing between them, so a reader cannot tell
where in the sort order they are. A pill under the section rail names it: the topmost visible row's
year under the date sort, its franchise initial under the franchise sort, its figure under a
`FinishedExtraSort` — a label, a `value` only the domain holds, an optional `bucket` naming the chip
— which Movies adds as Score and Books as Score and Pages, highest first with no figure last, since
a film never scored is the best of nothing. Without a `bucket` the figure names itself, so Books
buckets by the hundred (`700+`), `bucketLabel` shortening a bare four-digit string to a two-digit
year for the rail where a page count would read as one. The two built-in labels are reserved and the
wall throws on an extra taking one, `resolveExtra` answering the built-in first in `finishedItems`
and `bucketFor` alike, or a shared name would sort the wall one way and label the marker another.
`bucketFor` reads the field `finishedItems` orders by, through the same trimmed `franchiseKey`
falling back to the item's title, and answers `null` with no short form to give: an undated item,
which the date sort puts first, so the topmost card can be one.

Card size is the reader's — a `FinishedDensity` of Compact, Large or Full, whose column table
`finishedColumns` owns. Compact at `xl` gives a banner a fifth of the grid, about 220px, still a
picture with fifteen on screen; Large is four to a row from `md` up, near 400px; Full is one a row.
Two to a row is the floor, and a phone's: at 390px a card is about 190px, where three would be 95px
and a banner's own title, artwork rather than type the card sets, stops being readable. Posters and
covers go one step denser at every width, two thirds as wide as tall against a banner's sixteen
ninths, so one width stands two and a half times as tall. The page opens on Large, the dialog on
Full, the choice held for the visit and never written: the wall is the tallest thing on its page, so
a stored preference would have to be read before first paint to avoid changing it underneath the
reader. A phone opens on Compact instead — Large there gives one banner a row, and 322 games at
220px each would run seventy thousand pixels of page. The choice starts as "not yet chosen" rather
than seeded from the width and follows a rotation until the reader picks one, after which theirs
stays; seeding it from `usePhone` directly would mount every card at one density and remount it at
another a frame later, sampling each artwork twice.

Below `sm` neither the pill nor the rail mounts, and the wall derives the same rule inline:
`bucketGroups` (`common/finishedData.ts`) cuts the sorted items into runs wherever `bucketFor`'s
answer changes, kept as runs rather than collapsed to one entry per bucket as `orderedBuckets` folds
for a rail — a keyed grouping would lift cards returning to a passed bucket out of the wall's own
order. Each run stands under a sticky `BucketHeading`, the jump rail's own logic drawn in the flow,
since a phone has no gutter for a rail or room for a pill that does not sit over the cards it names.
It pins under whatever else is pinned above it in the same scrollport — the section rail's own
`SCROLL_MARGIN` on the page, the sheet's `SHEET_HEADER_BOTTOM` in the dialog — with `ExpandableCard`'s
clipping opened to `visible` at `xs`, a sticky element measuring against the nearest ancestor whose
overflow is anything else, a bordered card itself.

The reading test that shows the pill or rail carries a third clause: `rect.top < READING_LINE &&
rect.bottom > innerHeight / 2` alone would light the pill over a section's own header during the gap
between the section arriving and the wall's first row reaching the marker offset — true of any width
whose gutter falls under `MIN_GUTTER` (72px), which is every width on a phone. Requiring the grid's
own top to have reached `MARKER_TOP` (with the settle loop's own slack) asks the marker's real
question instead: not "is the section visible" but "is there a row here to name". Compact's grid also
drops the row's stretch alignment: a card ends where its own picture does (`alignSelf: "flex-start"`)
rather than at the row's height, since only a cover is ever short of it and a stretched cover reads as
a card drawn wrong — the row's _tops_ stay level either way, which is what both the marker and a
reader's eye read a row by.

Each card wrapper carries its label as a `data-bucket` attribute, and the scroll handler
binary-searches the wrappers for the first whose rect clears the reading line: the wall runs to a
thousand cards and the handler answers every scroll event, where measuring each in turn is a
thousand layout reads a frame, and document order is reading order, so the rects are ordered. Label,
visibility, offset and whether that offset is a centre are each a primitive in their own state, so a
scroll changing none re-renders nothing. The pill's gutter is measured from the section's own rect,
not the container's breakpoints, so no copy of those margins lives here; below the width it needs,
the pill tucks inside the container's leading edge.

Where the gutter is wide enough the derivation becomes a jump rail instead: the sort as a column of
chips down the page edge, spread from under the section rail to short of the fold. `orderedBuckets`
folds the `data-bucket` attributes to one entry per bucket at first encounter and keeps them in
**wall order** — descending years, ascending initials — where sorting would derive the rail from the
data a second time and let the two drift. Both sorts open each bucket once, a year being unique and
franchise-ordered initials non-decreasing, so the highlight only travels downwards and first
encounter matters only for a key returning to a value it passed. Chips take `space-between` across
the full span, indexing the whole page; a rail needs more than one bucket and every chip at full
height, bucket count times a slot of the chip plus a six-pixel gap against the measured span, and
otherwise the pill stands in, the lit chip already saying what the pill says.

`jumpTo` brings a bucket's first card to rest at the marker's own top offset, past the reading line
40px below, so `topmostBucket` names the clicked bucket on the very next scroll event and the click
never sets the highlight. The distance rule is the timeline's: smooth under a viewport and a half,
instant beyond, where the animation would only be a wait.

**The wall has to reserve its own height, or no offset measured in it means anything.** Grid artwork
is `loading="lazy"` and an unloaded image has no height: 322 games stand at about 7,000 pixels
against 33,000 loaded, and scrolling into a region is what loads it, so a jump far down the sort
asks for an offset short by all the artwork below and lands clamped at the document's bottom, a
decade short of the chip clicked. `Finished` reserves the shape on the grid's media through
`shapeToAspect`, the figure `cardArrangement` declares, and the leading `auto` that helper prefixes
keeps it a reservation rather than a crop. The stat strips reserve firmly through `shapeToRatio`,
since cards side by side must not differ in width by the few pixels an artwork is off its shape;
only a cover, whose ratio no file holds exactly, takes the `auto` form. The hero and timeline
tooltips are untouched; the Omnibus reserves on every card from its artwork's shape (§6).

What is left is a card's own rounding, absorbed by a bounded settle loop: it re-measures the
target's rect on a 90ms cadence and issues instant corrective scrolls until the card's top is within
two pixels of the marker offset — instant however the jump was made, a correction being that landing
at its real offset rather than a second jump. Ten corrective scrolls, a two-second deadline and a
token a newer jump takes bound it; a detached target ends it too, its rect all-zero. Only a scroll
the loop issues is spent against the count, or images streaming in would exhaust the allowance
before the first correction, and the wait for a still page is capped at six ticks for the same
reason: scroll anchoring nudges the offset on every image landing above the viewport, and a drifting
page is worth measuring, the next round correcting what the drift left.

**Interference is read from input, never from the page having moved.** Anchoring adjusts `scrollY`
precisely to compensate for the growth this loop corrects, so reading drift as a reader taking the
page back would abort on exactly the condition the loop is for. `wheel`, `touchmove`, a scrolling
`keydown` and `mousedown` end a jump — the last for the scrollbar, which moves the page without any
of the other three — attached for the settle window only and removed on every exit. None catches the
click that starts a jump, going on during that click's own `click` handler.

A bucket boundary falls mid-row for most buckets, so the row a jump lands at the top opens with the
previous bucket's spill and ends in the one clicked, and the marker reads that row's _last_ card,
cards within two pixels of the same top counting as one row; the leading card would light the chip
beside the one pressed at every boundary. Only a bucket near the end of the sort cannot name its
chip exactly, its row unable to reach the marker offset because the scroll clamps at the document's
end. The bucket list re-derives at the marker's own cadence, so both answers describe the same DOM,
and comparing the joined labels keeps that free.

### Stats and cards

`common/SectionHeader.tsx` is the header every chart card wears: icon and title left, a muted
`tabular-nums` count beside the title, controls pinned right. A thin arrangement over `CardHeader`,
so `MuiCardHeader` spacing and the `h6` weight reach it; the icon sits in the title row, not the
avatar slot, which centres against the whole header. The count arrives worded — a `common/` shell
cannot know it counts games. Below `sm` the controls take their own row, negative margins and all: a
title and four controls otherwise divide 375px and the title wraps to a word a line. A slot holding
no more than one icon button stays on the title row, the caller saying so through `compactActions`
— a row of its own for an expand toggle is a blank line with an icon at the end.

`common/Stats.tsx` exports what the domain `Stats.tsx` files assemble into a grid: `StatCard` and
`StatSummary`; `YearVitalsPair`, all-time and in-year cards differing only in figures; `StatList`;
`VitalsCard`, one card however many bands a domain stacks; `TotalsBand`, a proportional bar and
wrapping legend over `common/statsData`'s `groupTotals`. Domains hold the arithmetic, shells the
layout.

`StatCard` stands two to a row on a phone rather than one (`xs: 6`), a `span` prop overriding it
where a band's own count would otherwise leave a card beside a gap — the Now band's Franchises card
takes the full row alone, closing a band of three. Its figures stack rather than sit abreast below
`sm`: two or three across half a phone's width puts each under a word wider than itself, where a
column keeps figure and label on a shared baseline and lets a wide word wrap under its own number
instead of shrinking it. `TotalsBand`'s legend wraps the same way
above `sm` and stands in two fixed CSS-grid columns below it, since a name there is wide enough
against the screen that a wrapping row leaves one entry a line and its count wherever the name
happens to end.

`StatList` is two smaller shells the same file exports, each with a caller of its own:

- **`ExpandableCard`** owns a card that can also present itself fullscreen: `renderContent` draws it
  inline and again in the dialog, and is handed the expand control for its header. `useDialogMount`
  pairs `open` with a `mounted` flag lagging it until `onExited`, so the body survives the exit
  transition and is never built behind a closed dialog. `CardMediaImage` gates the whole `Dialog`,
  not just the body: an uncapped wall mounts one per item, and a closed `Dialog` still renders
  itself, its `Modal` and their hooks before returning null. The dialog takes an `onClose`, so
  Escape and a backdrop press close it like any other dialog; the header keeps its own control
  regardless, since a select switching to a category with fewer groups can shrink the content and
  strand the reader with nothing to press. Below `sm` that control is a pinned bar's own ✕
  (`stickySheetHeader`) rather than the header's icon, which wraps to its own row down there and
  would put the way out halfway down the first screen.
- **`StatsListGrid`** owns the capped strip of media cards. `COLLAPSED_CARDS` and `EXPANDED_CARDS`
  (6, and 500 — effectively everything, so a drill-down shows a whole group) apply _here_: a caller
  pre-slicing its list would make either a no-op. A strip laid out differently passes its own figure
  through `StatList`'s `collapsed`; a sized row states its cap in rows (`collapsedRows` — two, on
  Recently Finished), its card count following from the measured width. The header is built here,
  handed the cards drawn (`count` is `(shown, total) => string`), only the grid knowing that for a
  row-capped list. Lazy artwork makes the uncapped dialog affordable. Only `EXPANDED_CARDS` is
  exported: `omnibus/Gallery.tsx` derives its shelf count from it, `common/DrilldownDialog.tsx`
  reuses it.

  A caller opting in (`strip`) gets a third arrangement below `md` (`useStackedCharts`, read as a
  value for the same reason a folded chart is: showing a grid and a strip together would fetch and
  sample every picture twice): a fixed-height `Filmstrip`, since a phone's column has room for
  neither a grid's width nor a sized row's height. The height is solved from the measured row
  (`stripPictureHeight`) so a whole number of the list's shape fills it — as many cards as a
  target width allows (120px for a poster, 220 for a banner), never fewer than three posters or two
  banners, so a phone's 324px row holds three posters of 102 and a tablet's 686 holds five — and
  falls to 120px pictures only before the row is measured or where the cards mix shapes. `cellOf`
  answers a `strip` cell before either of the others, its height the picture plus a caption
  (`STRIP_CAPTION_HEIGHT`) and the band and border every cell counts; `limitOf` falls back to `COLLAPSED_CARDS` for a cap stated
  in rows, since a strip has none to multiply a solved count by. Each card is built from its picture
  out — `mediaLayout` fixed to `"stacked"` regardless of shape, since the arrangement rule would seat
  a poster's words beside a card 82px wide — and its corner chip drops unless the shape is landscape,
  where it would cover or overflow a narrow picture. `FooterComponent`'s `caption` prop replaces the
  label stack: `stripCaption` (`common/statsData.ts`) takes the first label row's cells as the two
  lines a fixed-height card has room for, a date over a figure with each whole (`captionLines`
  joins a third cell onto the second), since the closing row — the item's own name — is already
  the artwork's `alt` and a strip must not print it twice; a grouped list's `groupCaption` drops
  the group's name the same way, the fronting cover or banner carrying it.

`Finished` is built on `ExpandableCard` but keeps its own item grid, rendering the domain's
`MediaComponent` in a bordered `Card` at the spans its density asks; `DrilldownDialog` fills the list
a grouped card drills into with `StatsListGrid`.

`assignPercents` (`utils/mathUtils.ts`) floors each slice at 0.5% so tiny categories stay visible,
then absorbs the shortfall into the first entry so the bar fills exactly. `groupTotals`,
`topNWithOther` (`common/statsData`) and the Omnibus's genre bridge use it; `total` is a parameter,
so a caller states what its slices are a share of.

`FooterComponent` reads its rows bottom-up, the two ranks the hero and the Now band state: the
closing row carries the figures at `subtitle2` semibold, the rows above the context they belong to,
`caption`-size labels under `LABEL_SX` in the muted tone — sized as well as toned, two rows of one
size reading as a line dimmed. Under the artwork a row's cells keep their words together and the
row breaks between them, never inside a date, and the grid card is a size container so a caption
row on a card under 210px — six posters across a 1,200px page — steps to 10px with half the
tracking, where a date and a "days in" at the caption's own size are a line and a half. Shows'
poster lists pack four to a row at `md` and six from `lg` (`pictureWidth` takes an optional fourth
span) for the same reason: six at 900px are 133px each. The Omnibus's closing line is a name, which is why `omniLabels` states
the date first.

`common/Card.tsx` provides `CardMediaImage` and the `TypedCardMediaImage<T>` contract each domain
implements (`vg/`, `show/`, `movie/`, `books/`, `omnibus/` over the union): the adapter letting
`Finished`, `StatList` and the timeline tooltips render domain artwork and detail panels without
knowing the model. Several props are shaped by cost or surface:

- `detailComponent` is a thunk (`() => ReactNode`): `Finished` renders a card per item uncapped, that
  tree mounting only for the card opened. `TimelineData.tooltip` is a thunk likewise (§7, object
  lifetimes).
- `extractColour` is an opt-in, a theme derived from artwork costing a canvas read per image.
- `colour` is the card's theme colour; `chromeColour` sets the collapsed card's ground, panel and
  chip alone, leaving `colour` to the expanded card — the Now band painting four cards in their tabs'
  own colours to tell them apart on one row.
- `shape`, `rowSize` and `mediaBand` size a card on a surface holding several artwork shapes.

Without artwork, `ArtworkStandIn` takes the picture's place: a box in the palette's tile tone naming
what is missing, carrying the image's `sx` so it holds the reservation a wall measures its offsets
against.

Every chart mounts a card through one shell, `common/HoverCardTooltip.tsx`, split into two surfaces
sharing one API since there is no hovering on a phone — chosen by `useCoarsePointer` unless a caller
reading hundreds of marks has already asked once and passes the answer down as `coarse` (Timeline,
above). A pointer gets the popper: a 4px mat of the hovered bar's own colour, arrow to match and
shadow outside it; the flip keeping a tall card on screen, with `altAxis` doing the same at the edges
of a sideways-scrolling chart; and a 500px width that is a ceiling rather than a size below it
(`min(500px, 100vw - 16px)`), against a tooltip's own 300px default. A popper positions once, so the
content is observed and asked to place it again on every size change: a card whose chunk or picture
lands late otherwise grows from an anchor placed for something smaller, off the screen top. A finger
gets a bottom sheet instead, opened by a tap rather than MUI's own 700ms press, interactive so the
card inside can open the expanded card (a `disableInteractive` tooltip cannot), and mounted only
while open: `SwipeableDrawer` keeps touch listeners on the document for the life of every instance,
and a franchise strip is hundreds of marks for the one tapped. It sits at the modal layer, above the
dialog a bead inside an expanded card was opened from, and above that card in turn once the reader
taps through, since two surfaces at one layer stack by the order they opened in. `hoverCard` asks
for the card treatment on either surface; a band whose tooltip only names its span keeps the plain
one.

Each domain exports the **hover card** its charts show — `VgHoverCard`, `ShowHoverCard`,
`MovieHoverCard`, `BookHoverCard` — beside its `CardMediaImage`, and the Omnibus dispatches to the
same four by medium, so a hovered bar shows the same card wherever it is hovered.

### One arrangement rule, for the one tab that needs it — `common/cardArrangement.ts`

A card given a `shape` arranges itself by it: **landscape artwork stacks its words below, portrait
and cover artwork seat them beside**. It reserves that shape from the same table before the image
loads, so what a card holds space for and what it is arranged for cannot come apart.

A mixed row is where one arrangement fails: words beside a 16:9 banner get a sliver of a column, and
the strip beneath a poster half as wide as it is tall clamps every title to three characters. Shape
gives each the axis it has room on, and a row varies gently in width at one height.

**Only `omnibus/` passes a shape.** Each home tab's artwork is one shape — Games and Movies banners,
Shows posters, Books covers — so its pages are laid out for it already, and a card naming no shape
keeps its caller's arrangement. A caller pinning its own artwork size names the arrangement outright
through `mediaLayout`: the hero.

Posters are authored to 680×1000 and banners to 16:9, so a layout holds either exactly; a cover is
whatever its publisher drew, near 2:3 and a few percent off either way — a third shape rather than a
second kind of poster, the difference being exactness. `shapeIsExact` is what a surface pinning a
ratio asks: where it holds a poster exactly it gives a cover the `auto` reservation (`shapeToAspect`)
the walls use, the declared ratio sizing the card until the file loads and its own ratio wins. The
hover cards and the Now band are those surfaces — a hover card's artwork stands 348px tall beside its
words, or spans the card at 16:9 above them.

The ratio measured is the declared one, never a file's pixels, which are off by a few: measured, a
band would stand two cards of one shape at different widths for a reason no reader can see.

The shape travels, not the arrangement: `CardMediaImage` decides the card's axis, artwork column,
reservation and the edge carrying the seam, publishing the result on a context `CardPanel`,
`FooterComponent` and `StatTileGrid` read, so the two halves of a card cannot disagree about which
way round they are. The column then gives a footer's rows their three-line wrap ceiling and fits a
tile row at a 72px floor, wrapping the rest — a narrower tile is narrower than the word under its own
figure. Bare artwork is not arranged: the rule divides a card between picture and text, so a gallery
shelf's wordless pictures keep the whole card.

### Page architecture — hero, rail, sections

Every tracked domain lays its page out by temperature: what is being played, watched or read now,
then what the library is made of, then what can be explored, then the deep dives.

All four tabs lead with a single item by a tie-break its data holds: Games the game in progress,
Books the book in hand most recently begun, Movies the film watched most recently. Shows needs the
sheet's help, several shows always being in flight — the current one is whatever the Status cell on
an in-progress season row marks with a last-watched date, and until the sheet marks anything the page
falls back to the currently-watching strip, the rest staying in a compact "Also Watching" strip under
the hero.

`Hero` (`common/Hero.tsx`) presents one item large through the domain's own `TypedCardMediaImage`:
the artwork opens the same expanded dialog a thumbnail does, and the panel rides in as that card's
`footerComponent`, inside the `ArtworkAccent` the image publishes, rather than sampling the image
twice and painting from whichever answer arrives first. Only the artwork's height is fixed — 300px
from `md`, 280 at `sm` and, beside a poster, 300 at `xs` — the desktop's own height, near the 380
a banner hero stands at there, so the four heroes read as one size — so the hero is one height whatever it shows while every
poster and banner keeps its shape (a banner around 533px wide, a poster around 200), and past a
560px ceiling `objectFit: contain` letterboxes a panorama onto the card's own ground.

Where the words sit is the shape rule, and the shape is all the hero is told: the domain names its
own artwork once at the call site, and a banner stacks its words underneath on a phone and seats them beside from `sm` (at 260px,
462 wide, beside a 258px panel on a 768 page) while a poster or a cover seats them beside at every
width. A portrait picture given the page's whole width
is the whole of the first screen — a poster stands 525px at 390 and a cover 585 — so the phone's
hero would open on one picture and start its figures below the fold. Below `md` the words beside
a poster are held to its height — a title one size down and clamped to three lines over the subtitle,
and the figures as lines (`StatLines`) rather than tiles, one a line in the phone's 154px column
and two from the tablet's, "3.6 hours" in the panel's ink with its label beside it in the muted
tone — so the poster fills its column with no ground beneath it.

Its figures are the item's own — hours logged, days in, franchise size — a tile dropped rather than
zeroed where the sheet is silent, library totals staying in the cards below. The kicker says why the
item is shown, naming on Shows the episode in hand, which the title, the show's own name, does not.
The panel's middle is the franchise strip in its hero variant: the order reading with no switch, its
chain held to one row and closed up on a series too long for the pitch, a panel held to the
artwork's height having no room for a second. It drops at the same two widths the strip itself hides
at (above) — on a phone the panel is a little over 200px, and the expanded card one tap away draws
the same strip with its switch. No corner chip, no ledger row: everything a chip abbreviates is
already in the panel.

`SectionRail` and `Section` (`common/SectionRail.tsx`) are the page's table of contents, pinned under
the app bar — `position: static` and scrolling away, so the rail is the only thing an anchor has to
clear. Chips scroll rather than link, the app being served under a `HashRouter` where an
`href="#timeline"` reads as a route; `Section` exists rather than a bare `id` for its
`scroll-margin-top`, without which the browser lands a section's top edge under the sticky rail.

The same module holds the two arrangements a section is built from, page structure rather than
visualisation: `StatBand`, the stretched row of stat cards, taking children, and `ChartPair`, the
md-split standing a sunburst beside a barchart, taking a `left` and a `right` — one spacing rule
rather than eight sites across two domains. Each domain's `sections.ts` owns the id map and builds
the chip list, whose ids have two holders — `Stats` the bands above the charts, `Graphs` everything
below — and which comes from the same test `Stats` makes about whether there is anything to lead
with, so a chip never points at an anchor that is not on the page.

The rail also carries the page's measure, in an `actions` slot at its right end: the unit every
figure on the tab is counted in belongs on the one control surface reachable from anywhere. A second
slot, `trailing`, carries the filter control on a phone (`FilterChip`, below) — both sit outside the
scrolling chip row, which would carry either away; the row gives up width and overflows into its own
scroll. `SegmentedControl` states the measures as words, a Σ on a floating button being a legend
nothing on the page teaches.

The tab chips that lead the stuck rail are dropped entirely below `sm`, where the bottom navigation
already holds all five tabs at every scroll position and a rail spending 300 of its 358px saying so
again buys nothing; a rail's own chips still fill the rest. Under a coarse pointer every chip in the
rail — a tab's, a section's — stands 30px tall rather than 22 (`ChipRail`'s `COARSE_CHIP_HEIGHT`,
behind `@media (pointer: coarse)` so a tablet with a mouse plugged in gets the desktop's own
height), which `SCROLL_MARGIN`'s 72px still clears with room for the rail's padding.

A page's charts and its library swap on a phone, library first — `ChartsAndLibrary` renders the two
nodes in that order and `chartsLastOrder` (`common/sections.ts`) reorders the chip naming them, both
driven off the one `usePhone` a `Graphs` module reads once. Both halves have to agree in the DOM and
not only in CSS: `useActiveSection` lights the first of the rail's own list still inside the reading
band, so a page painted in one order and a rail listing another lights the wrong chip from the first
scroll, and a chart folded shut under `FoldedChart` mounting nothing at all rules out a `flex-order`
swap that would still fetch and lay out the chart it hides. Only the `charts`/`library` pair moves —
a tracked tab's packed timeline, drawn through its own `Section`, keeps its place in the list either
way.

### Phone and tablet

Most of what a narrow screen or a coarse pointer changes is stated inline against the subsystem it
touches — the Now band, the franchise strip, the hero, a folded chart, the scroll marker. What
follows is the scaffolding underneath: the primitives every one of those reads, and the chrome
around the page itself.

**Two questions, answered as values.** `usePhone` and `useStackedCharts` (`common/breakpoints.ts`)
are the only breakpoints the app reads as booleans rather than writes as `sx` keys, because their
callers need the answer before they can decide what to render at all — a folded chart mounts nothing
until opened, a sheet and a persistent drawer are different trees, and the tracked tabs put their
charts after their library in DOM order (above), which no `display: none` or flex `order` can do.
Both are `useMediaQuery` with `noSsr: true`, stating the query's real answer as the server snapshot
too: `main.tsx` mounts with `createRoot` and never hydrates, so that snapshot is never read and the
first render already matches the screen regardless — but the option is what keeps that true of a
root that did hydrate, one hook giving one answer rather than two depending which root mounted it.
`useCoarsePointer` answers a different question — how precisely the reader
can aim, not how wide the screen is: a hover card is a popper on a mouse and a bottom sheet on a
finger, different trees again. A hit target or a hover treatment that is only a rule stays in `sx` as
`@media (pointer: coarse)` and costs no subscription. All three, plus `useScheme`, share one
mechanism, `common/useMatchMedia.ts`: one `MediaQueryList` and one native listener per distinct query
string, held at module scope and fanned out through `useSyncExternalStore`, because a caller asks per
component instance and a chart is hundreds of them — a fresh `matchMedia()` and a fresh listener per
instance would be that many of both minted on every render.

**Chrome.** Below `md`, or on any coarse pointer regardless of width, `NavBar`'s Sheet/Authorise-or-
Revoke buttons collapse from the app bar into an overflow menu (`⋮`), built from a single `BarAction`
list drawn twice — as buttons and as menu items — so the bar and the menu can never disagree about
which actions exist or whether "Authorising" is live: both are on screen at once wherever a finger is
the pointer. At 768px the wordmark, five tabs and two buttons want about 800px of a 720px content
width, which is the arithmetic behind the `md` cutoff; a tablet held sideways clears the width test
but still fails the pointer one, so the menu stays. The same menu is guest mode's only handle under a
touch pointer, carrying a "Guest mode"/"Leave guest mode" item — the long press that reaches it
elsewhere is a mouse gesture alone (§7, Guest mode), and without the item a finger would have no way
in, or once in, no way out but a reload.

Below `sm` the tab strip itself is replaced by `BottomTabs`, fixed to the screen's bottom edge and
reachable from any scroll position and a thumb, which no arrangement of the `position: static` app
bar achieves; it wears the tab's own `barColour` as the app bar does, so the top and bottom of a
phone name the same tab, and a tab change resets scroll (`window.scrollTo({ top: 0 })`) the way the
rail's own chips do. `common/chrome.ts` states what the app's own furniture costs the page:
`BOTTOM_TABS_HEIGHT` (56) and its `env(safe-area-inset-bottom)`-padded `BOTTOM_TABS_CLEARANCE`, which
the page container and the data snackbar both stop short of, and `safeAreaGutters`, MUI's own
`Container`/`Toolbar` gutters restated with the device's side insets added — a notched phone held
sideways puts a sensor housing or a rounded corner exactly where an unpadded 16px margin sits. None
of it does anything without `viewport-fit=cover` in `index.html`, which is what makes `env()`
anything but zero, and the manifest's `theme_color` is the Omnibus tab's own primary (`#7553ff`), the
colour a phone's status bar wears before any tab-specific theme has painted. `Google.tsx`'s
`MuiCssBaseline` override turns off the grey tap flash on `body`: it is drawn at a tap target's own
box, which on a chart is a whole row group behind a bar a few pixels wide, and every tap here already
answers with the card it opens.

**Touch surfaces.** `common/touchTarget.ts` is the shared hit-box recipe behind the franchise strip's
beads and `TimelineBandBox`'s bands (above): a box sized for a coarse pointer alone, invisible and
stated as a height so it cannot reach over a dense neighbour. `FoldedChart` (`common/FoldedChart.tsx`)
is the general mechanism behind every folded chart above — five callers — a card that renders only
its header, a one-line summary and a shape-of-the-data preview until the reader asks for the chart
itself, past `usePhone` alone; from `sm` up it is the plain card it always was. The packed timeline
alone never folds (above). `CONTAIN_SIDEWAYS_SCROLL` (`common/scrollbarSx.ts`) is the same fix
against the browser's back gesture (above, Timeline), worn by every other horizontal scroller in the
app — the charts, the strips, the chip rails, the sized card rows.

### Colour

`utils/colourUtils.ts` extracts a dominant colour from each artwork with `fast-average-color`,
ignoring near-white and near-black, and retries with the `simple` algorithm when the ITU-R BT.709
luma falls outside 30–230, avoiding unreadable extremes. Results are memoised by image src, and
`getContrastText` sets the type over them, so a card's palette derives entirely from its artwork.

**Every chart colour is a pair, not a value.** `utils/types.ts` declares `Fill` as `[light, dark]`:
the light half is drawn only on the `#ffffff` paper and the dark only on `#1d2126`, each clearing
3:1 against its own paper alone. One hex clearing both is confined to OKLCH L 0.526–0.668, a span of
0.142 — and lightness _is_ the identity of the warm half of the wheel, a yellow at L 0.67 being
`#af9300`, an olive, against `#fdd500` at L 0.88.

Every lookup takes a `Scheme`, read by `common/useScheme.ts` from
`window.matchMedia("(prefers-color-scheme: dark)")` rather than MUI's `useColorScheme`:
`Google.tsx` builds the theme with `cssVariables: true` and no `colorSchemeSelector`, so MUI emits
the dark palette inside that same media query, but its `mode` is separate state restored from a
`mui-mode` key in `localStorage`, and anything writing one parts the two, every fill taking the half
meant for the other paper. The subscription goes through `common/useMatchMedia.ts` (§6, Phone and
tablet) — one `MediaQueryList` shared by every caller of a query rather than one per component
instance — which is what re-renders a chart when the system flips at dusk.
`tests/utils/fillContract.test.ts` asserts the floor over every table
against its own WCAG implementation, so it cannot pass by agreeing with a bug in `src/`.

Values are placed rather than picked: hue and role go in, lightness is solved until the value clears
its floor, anchored on a real-world source where one exists. The age-rating ramp takes the colours
PEGI prints off its official icons — lime `#a5c400`, amber `#f5a200`, red `#e2011a` — and splits the
pairs PEGI gives one colour, 3 with 7 and 12 with 16, since a chart drawing 3 and 7 alike cannot be
read. Splitting on **hue as well as lightness** takes them from about dE 11 apart, under the 15
telling two fills apart wants, to 19.0 and 15.0. BBFC colours its own 15 pink, breaking the ramp's
ordering, so the table merges it with PEGI 16 into one band.

The status ramp orders on **relative luminance** rather than lightness, which is what a reader
squinting at a chart sees: a green carries roughly twice the luminance of a blue at one OKLCH
lightness, so ordering on lightness puts Beat above Endless and inverts the reading. `Endless` and
`Up To Date` are separate states — a show still running that you are current on waits on its source
— so the blue is the waiting state alone and Endless joins the greens beside Beat/Ended.

The decade ramp sweeps hue alongside lightness for the same reason: eight buckets of lightness alone
land neighbours 2.3 dE apart and the 2010s beside the 2020s at 0.8, under the ~2 dE at which two
fills are one colour. Sepia gold to deep russet doubles that to 4.6 and takes the ends from 13.4 dE
apart to 32.1.

Fixed colours are the other half: each domain's `types.ts` maps platforms, genres, franchises and
ratings, `utils/types.ts` the cross-domain ones. Brand tables hold hue and chroma and move lightness
only as far as the half being drawn demands, so a brand inside the band on both papers carries one
value twice — Mario, Marvel, Zelda. Eight franchises relax the floor on the **white paper alone**,
keeping the full 3:1 on the dark: Witcher, Uncharted, Assassin's Creed and Tales at 2.2:1, carrying
their brand hex exactly, and Pokémon, Warcraft, Star Wars and Star Trek at 1.8, their identity being
their brightness — a yellow at 3:1 on white is a brown-gold, 20.8 dE from Pokémon. The contract
allows that where colour is not the only carrier, and each is named beside its swatch. It costs
separation between brands sharing a hue — seven reds, six blues — so the set is scoped to keep those
off one chart, Marvel beside Harry Potter on the Movies bar the closest pair anywhere at 10.7 dE.

`vg/types.ts` splits a company two ways: **fills** for chart geometry and **accents**, the brand
hexes themselves, drawn only in a card's corner chip, where a few dozen pixels of type read as a
badge rather than as something to compare. PC has no brand to reproduce and takes the amber of the
beige box rather than Steam's cool blue-grey, which sits on PlayStation's own hue — two blues
separated only by lightness and chroma read as one however far apart they measure. PlayStation keeps
its published `#006FCD` on both papers and iOS Apple's space grey, 11.8 dE from the neutral: the
table's weakest link, under the 15 two fills want, so labels stay load-bearing for a pair meeting
only in the Top Platform list, where every row is named.

The genre ramp is shared by all four tracked sheets, so a hue means one genre on every tab, and
falls to `NEUTRAL_FILL` off-table because the column is open-ended. Each hue means its genre — blood
red for Horror, flame for Action — and twelve at one lightness is more than hue separates, 27° apart
being roughly dE 7, so lightness alternates around the wheel. Abstract depicts nothing to borrow
from and takes magenta, the one hue with no wavelength behind it, 10.1 dE from Fantasy on the white
paper: the tightest pair, just inside the 11.8 Horror and Romance sit at, the dark half clearing
everything by 16.1. Games draw `gameplay` beside it — how a game is played, where `genre` is what it
is about — sharing exactly two hexes, Action and Adventure, which mean the same in both; the rest go
as far apart as one lightness band holds, fourteen gameplay and twelve genre hues each wanting 15
dE, so Role Playing lands 2.3 from Thriller on the dark paper. Both stay at full chroma, always
labelled where they meet — the ledger stacks a Gameplay row on a Genre row.

**Franchise is shared for the same reason and answers `""` off-table.** All four sheets record a
Franchise column and eleven franchises are met in more than one medium — Marvel across three, Star
Wars and Harry Potter across games and film, Fate and Star Trek across games and television — so a
per-domain table would draw one of them a different colour on each tab. The set covers what a tab's
collapsed Top Franchise card and the gallery's shelves draw, plus every cross-media franchise among
them; the long tail is 168 values in the games sheet alone, most a work naming itself.
`tests/utils/fillContract.test.ts` pins it: a cross-media franchise resolves to one value through
all four domains' `groupToColour`.

Seven vocabularies live in `utils/types.ts` because more than one tab speaks them: the genre ramp,
`statusToColour`, `franchiseToColour`, `decadeToColour`, the score bands (`scoreBandToColour`, which
Movies and Books both rate on), `ageRatingToColour` over the `AgeRating` union three of the four
domains record a certificate into, and `mediumFills` with `mediumToLabel`, `mediumToName` and
`mediumUnit` — the only colour a mixed-media surface carries meaning in, re-exported by
`omnibus/types.ts`. Its hues are the home tabs' own, so `tabs.ts` constrains them; the closest pair
is 16.8 dE. The light Books half is `#ab9219`, the brightest gold clearing 3:1 on white, not the
tab's darker `#958112`, because lightness is what a deutan reader has left: at the Movies red's
lightness a Books gold collapses onto it under simulation, 1.3 dE at `#857200` against a working
floor of 8, and the genre bridge's segments and the crossings' lanes carry no label. One step
brighter the pair sits 10 dE apart under deutan and 19 under protan, hue unchanged.

The status table treats Playing, Watching and Reading as one state and Beat, Ended and Finished as
another, each word taking its state's fill exactly, so a chart over the union draws one colour per
state. Games are logged as PEGI and write the suffix (`16+`), Shows and Movies as BBFC and write the
bare number (`15`); the colour keys off the age, not the notation, and `isAgeRating` lets a
converter reject a bad cell while it still knows the row. `ageRatingBand` names that tier rather
than colouring it, and is what the colour is looked up by. Books adds three formats at chroma 0.14,
drawn only in a labelled band and the filter's chips; Movies adds the Cinema/Home pair and
re-exports the score bands — valenced red through amber to green, Unscored on the neutral — under
its own name. Shows colours networks as brand-derived fills with `""` off-table, the column gaining
a streamer whenever one launches, keyed on the string the **sheet** writes: `HBO`, though the brand
is HBO Max, since renaming the key would silently drop the colour.

`artworkPalette` in `common/artworkPalette.ts` is the one recipe every surface carrying a sampled
colour reads — footer strips, hover panels, the hero band, the expanded card's ground, tiles and
strip — and its own module, a hook exported from a file of components being a hot-reload boundary
the lint rules refuse. The ground is the sample exactly, tying a surface to its artwork; extraction
holds anything between luma 30 and 230, so the type comes from `getContrastText` on it rather than
fixed. Every other tone is that contrast colour made transparent, compositing over a coloured ground
to a tint of its own hue with no rule for which direction to mix in: the muted tone for dates and
labels, the rules and empty tracks, the wash that lifts a tile, the three-pixel seam against
artwork. The palette is total, filling the same shape from the theme when nothing is sampled, so the
colourless state every card paints first needs no branch anywhere. `CardMediaImage` publishes its
accent on that module's context, the card being the only thing that knows its own ground.

## 7. Cross-cutting design decisions

### `PlainDate` instead of `Date`

`common/date.ts` defines an abstract `PlainDate` over `Year`, `YearMonth` and `YearMonthDay`, because
the source data is calendar-precision and sometimes only a year (an old game logged as `2007`), which
`Date` cannot represent without inventing a day and a timezone.

- **Interning.** Private constructors plus a static cache make identical dates reference-equal, so a
  `Map` keyed by date works — `Barchart`'s pivot relies on it.
- **String-comparable.** `valueOf`/`toString` give the zero-padded ISO-ish form, so `<`, `>` and
  `sortByKey` work with no accessor calls.
- **Serialisation symmetry.** `toJSON` emits what `PlainDate.from()` parses, which is what makes §4's
  round-trip possible.
- **Dispatch by length.** Ten characters gives a `YearMonthDay`, four a `Year`, anything else throws,
  so a partial `"2024-05"` is a loud failure.

`firstDay()`/`lastDay()` give the range a value denotes, so a consumer states which end of an
imprecise date it wants instead of reaching for a subclass. `daysTo` compares those ends — a bare year
is a prefix of every date inside it, so comparing values directly reads 1 January as later than its
own year — and throws only on a genuinely transposed pair. It answers `undefined` when either side is
year-only, so durations degrade rather than fabricate precision; where a chart cannot degrade, half
the games carrying a bare year, `vg/cardData.ts` shares each year between the games naming it, in
release order, and marks the spans `precise: false`.

### Prototype augmentation

`Array.prototype.sum` / `sortByKey` (`utils/arrayUtils.ts`) and `Map.prototype.setIfAbsent`
(`utils/mapUtils.ts`) are declared on the global interfaces and installed behind existence checks;
`sortByKey` is non-mutating (`toSorted`), and `main.tsx` imports `mapUtils` for the side effect alone.
A global-namespace change confined to two files, with `tests/architecture.test.ts` requiring each
caller to import what installs it.

### Branded types

`Distinct<T, Name>` produces nominal types over primitives: `Colour` keeps arbitrary strings out of
colour props, `YearNumber` distinguishes a year from any other number. `KeysMatching<T, V>` restricts
grouping and filter keys to fields of the right value type, which is what makes the generic
`FilterCategory` and select boxes type-safe across domains.

### The React Compiler owns memoization

**Do not hand-write `useMemo` or `useCallback` here.** The
[React Compiler](https://react.dev/learn/react-compiler) is enabled in `vite.config.ts`
(`reactCompilerPreset`, through `@rolldown/plugin-babel`) and auto-memoizes render-phase work; a
hand-placed memo is redundant and rots as dependencies are added. `eslint-plugin-react-hooks@7`'s
`recommended` config _is_ the compiler rule set, so `npm run lint` catches most of what follows.

**The compiler silently skips functions it cannot prove safe.** Five constructs opt one out, none
with an error to say so:

- **`this`.** Highcharts binds the chart to `this` in event callbacks, so those live at module scope
  (`dimLeafRing`, §6) or take the whole component with them.
- **`??=`**, which it cannot lower. Write `x = x ?? y`.
- **A destructured prop default** (`({ landscape = false })`), an assignment pattern
  `BuildHIR::lowerAssignment` cannot lower. Read defaults off the props object instead.
- **An import expression**, which is why each entry component keeps its `import("./Graphs")` in a
  module-scope `loadGraphs` that `lazy()` and the prefetch effect both call.
- **An object literal with a computed key** — `{ [theme.breakpoints.down("sm")]: {...} }`, the shape
  a phone-only style rule takes wherever the value itself has to change and not only be hidden.
  Written inline it bails with `BuildHIR::lowerExpression … Expected Identifier, got CallExpression
key in ObjectExpression`; pulled out to a plain function taking the varying pieces as arguments —
  `sheetBarSx`, `dialogCardSx`, among others — the literal itself sits at module scope and the
  component stays compiled.

The baseline is **242 compiled, 0 bailed**, so any bailout is a regression; the `MethodCall` kind
responds to moving the computation into a plain module. Re-check by passing a `logger` to
`reactCompilerPreset` (see [AGENTS.md](./AGENTS.md)). The compiler costs about 4% of bundle size
(~15KB gzipped) in cache slots, a trade `npm run analyze` keeps honest.

### What the compiler does not do

It removes _repeated_ render work. It does not make eager work lazy, fix object lifetimes, or hoist
anything out of a module-scope function:

- **Concurrent rendering.** `useDeferredValue(data, [])` in every `Graphs` module keeps filter
  interactions responsive while charts re-render at lower priority, and `Finished` dims itself
  (`opacity: 0.5`) while its deferred value lags. `lazy()` + `<Suspense>` keeps chart libraries out of
  the initial bundle, and `usePrefetchGraphs` starts the import on mount so the chunk downloads
  alongside OAuth and the sheet fetch. It stays out of module scope because `tabs.ts` imports all five
  entry components eagerly: hoisted, it would fetch every tab's charts on any visit.
- **Lazy construction.** `Card`'s `detailComponent` thunk and `TimelineData`'s `tooltip` thunk (§6),
  plus `ExpandableCard` mounting its dialog body only while open. `FoldedChart`'s `fold` thunk is the
  same idea for a chart's own data — a second pivot, a hierarchy's first ring — called only past the
  phone check, and its `children` are the chart itself, passed as JSX rather than built behind a
  condition: React does not render a child it is handed but does not place, so the tree is built by
  the caller and mounted or not by `FoldedChart` alone. The crossings stack goes one step further and
  splits into its own component, mounted only once its folded card is opened, for the same
  `useOpenAtLatest` reason (§6, Omnibus).
- **Object lifetimes.** `useTextPlacement` keys a ref map by row objects rebuilt whenever data
  changes, deleting an entry once all three refs detach; otherwise dead rows retain their tooltip
  trees, and through them the domain records.
- **Module-scope hoisting.** `Google.tsx` caches themes per tab and reads MUI's default palette once;
  `common/sunburstData.ts` and `common/finishedData.ts` each hoist an `Intl.Collator` rather than
  calling `localeCompare` across thousands of comparisons. The compiler's per-component cache is a
  fixed slot array, so it would not survive A → B → A navigation as the theme `Map` does.

### Filter state

Filter state carries a composed `filter` predicate as a _field_, rebuilt inside the reducer whenever
an input changes. Components call `data.filter(state.filter)` without knowing which criteria are
active, and adding a criterion means adding one predicate to the `filters()` builder.

`createFilterReducer(initialValues, filters)` in `common/filterReducer.ts` returns a domain's
`useFilterReducer` and owns what is the same everywhere: the action union, the `useOutletContext`
guest-mode wiring, rebuilding `filter` after each change, and three shared pieces —
`yearPredicates` (an "up to" ceiling that disappears once it reaches the current year, or an exact
match), `selectedPredicates` (a multi-select where an empty selection is no constraint, returned as a
list so an inactive control contributes nothing rather than an always-true predicate), and
`activeCount`, bound to the initial values the reducer already holds. Each domain supplies only its
own initial values and how to turn that state into a predicate.

The measure action _sets_ rather than advances, the control being a segment per measure: a press
names its own state, so setting the measure already held answers the same object and costs no render.
It is also the one action that does not rebuild `filter`, since no `filters()` reads the measure and
consumers re-filter on that predicate's identity.

`countActiveFilters` counts fields, not predicates — three genres picked in one select are one choice,
undone in one place — comparing arrays element-wise and leaving `measure`, `filter` and `guestMode`
uncounted, guest mode surviving Clear.

`vg/filterUtils.ts` shows the full pattern: toggles, multi-selects derived from the data through
`common/filterOptions`, a year cutoff, a Games/Hours measure. `common/FilterDrawer` is one shell
taking the active count, the reset action and the domain's controls as fully controlled children; the
measure is not in it, being the unit every figure is counted in rather than a narrowing of what is
counted, so it rides the section rail (§6). `yearPredicates` takes a `yearOf` accessor defaulting to
`startDate.year`, so the Omnibus passes `(item) => item.year` for an `OmniItem`, which counts towards
the year it closed. Shows keeps its own predicate — "has a season started in (or by) the year" —
keeping the filter and the seasons-in-year vitals card in agreement.

### Guest mode

Long-pressing the wordmark (`utils/useLongPress.ts`, 300 ms, over the pure `longPressReducer`) sets
`guestMode`, which flows through the router's outlet context into each domain's reducer and appends a
predicate: a game whose `theme` includes `"Adult"`, a show whose `type` is anime, a film carrying the
sheet's `anime` flag; nothing marks a book. Each domain exports its `guestFilter` by name, since the
mode is applied a second time to the franchise index and to the union through `visibleLibrary` — an
index that skipped it would put hidden items back on screen through a card strip. It is presentation,
not a security boundary: the data is loaded already.

The gesture is the pointer's alone — the hook answers with mouse handlers and nothing else, a long
press on touch colliding with the browser's own press-and-hold — so the app bar's overflow menu
carries the mode as an item instead, in both directions, and is drawn wherever a finger is the
pointer. The wordmark carries the press rather than the whole bar: a bar holding a tab strip and a
menu button is three hundred pixels where a press landing on none of them changes what the page
shows.

### Theming and routing

`Google.tsx` builds an MUI theme per tab from its `primaryColour` / `secondaryColour`, with
`cssVariables: true`. Both colour schemes are written out, because `colorSchemes.light` replaces the
top-level `palette` rather than adding to it, so a value named on one side only leaves the other on
MUI's stock blue. `enableColorOnDark` stays off and each tab carries a `darkBar` (`tabs.ts`) — a 22%
`tint` of its primary over the dark paper plus `rule` and `ink` siblings — read through
`barColour(tab, scheme)`, the single answer for what the bar wears, so a surface painted to match it
cannot drift. Two `theme-color` metas are emitted, one per scheme. Themes are cached in a `Map`
keyed by tab id:
building one walks both schemes, typography, shadows and the whole CSS-variable map, and a stable
identity stops the MUI tree re-evaluating `sx` on navigation. `Google.tsx` also mounts
`FranchiseUnionProvider` around the `<Outlet>`, a card on any tab drawing its franchise across all
four media.

Routing uses `HashRouter` because GitHub Pages cannot rewrite deep paths to `index.html`. The root
route and the unmatched-path fallback are positional — `App.tsx` renders `Tabs[0].component` for the
index and `tabForPath` falls back to `tabs[0]` — so a tab's place in the exported `Tabs` array decides
what a bare `/` opens. Omnibus leads for that reason.

## 8. Extension points

**Adding a data source.** Add a `Tab` to `src/tabs.ts` (sheet id, A1 range, route id, component,
colours) and then to the exported `Tabs` array, which generates the router and nav bar and decides the
root route's fallback (§7). Create `src/<domain>/` with `types.ts`, an entry component calling
`useData` with the `DataConfig` its `converter.ts` exports, and a lazy `Graphs.tsx`. Implement
`CardMediaImage` against `TypedCardMediaImage<T>` to get `Finished` and `StatList` for free.

A fifth medium also extends the `Medium` union in `utils/types.ts` with its fill, label, name and
unit; gives `toOmniItems` a case and `visibleLibrary` a rule in `omnibus/adapter.ts`; adds its
`useData` call to `omnibus/Omnibus.tsx` and `omnibus/franchiseUnion.tsx`; and exports a per-item entry
mapper from its own `cardData.ts` beside `gameEntry`, `seasonEntry`, `movieEntry` and `bookEntry`.
That mapper returns a `FranchiseEntry`, and both the domain's own card strip (through
`CardMediaImage.tsx`) and `unionEntry` in `omnibus/franchiseUnionData.ts` call it, so a tab's index
and the cross-media union cannot draw one item two ways.

**Composing existing data sources, without a sheet of its own.** `omnibus/` is the reference: its
`Tab` carries no `spreadsheetId`/`range` (both optional for this case, with `SheetTab` restating them
as required for anything that fetches), and it calls `useData` with each composed domain's own config.
A pure adapter re-shapes their output into one vocabulary the shared shells render. The new folder may
import the domains it composes, never the reverse, and stays outside `common/`/`utils/`.

**Adding a visualisation.** Domain-agnostic, it belongs in `common/`, taking data plus callbacks with
a thin adapter per domain; domain knowledge belongs in the domain folder. The existing shells set the
level of inversion — `Sunburst` takes four callbacks, `Barchart` a data function and a scalar
`postAggregate` — and it stays at the level of _values and meaning_.

**Adding a filter.** Extend the domain's `FilterState` (extending `BaseFilterState`), push a predicate
in its `filters()`, and render a control in `Filter.tsx`. Nothing in `common/filterReducer.ts` or in
any chart changes.

## 9. Repository layout beyond `src/`

- **`extension/`** — a standalone Chrome MV3 extension (plain JS, loaded unpacked) adding "Upload
  Show/Movie Image" context-menu items on images and handing the URL to a macOS Shortcut via a
  `shortcuts://` URL. This is how banner artwork gets into Google Cloud Storage; it is outside the
  Vite build and shares no code with the app.
- **`.idx/`, `.vscode/`** — Google Project IDX and VS Code editor configuration.
- **`analyze.html` / `analyze.json`** — committed output of `npm run analyze`, indexing a
  `src/holiday/` domain the tree does not contain and mentioning neither `omnibus/`, `movie/` nor
  `books/`: neither compares against a shape the build produces. The script prints its analysis rather
  than writing a file, so refreshing them is a manual capture.

## 10. Known gaps

Recorded so they are not mistaken for design:

- **No error boundary.** `main.tsx` renders `<App/>` bare, so one throw anywhere in the tree blanks
  the page with no message — which is why `parseCachedItems` and `parseTokenWrapper` each guard a
  `JSON.parse` in a `useState` initialiser. Unguarded paths remain:
  `initTokenClient({ client_id: CLIENT_ID })` runs in an effect with no check, so a missing
  `VITE_GOOGLE_CLIENT_ID` throws there and takes the app with it.
- **No loading state.** An entry component renders `{data && <Graphs/>}` beside its snackbar, so a
  first visit on a cold cache is a nav bar over an empty page while OAuth and the sheet read run. The
  Omnibus waits on all four sheets, so it waits longest.
- **A deep link to a home tab fetches all four sheets.** `FranchiseUnionProvider` mounts above the
  router so any tab has the cross-media union; a deep link to `/vg` therefore pays three extra sheet
  reads and paints from cache until they land, where the Omnibus has usually fetched them already. A
  deliberate trade, argued in that provider's own comment (`omnibus/franchiseUnion.tsx`).
- **The filter drawer's desktop shape ignores `onClose`.** From `sm` up `FilterDrawer` renders a
  `Drawer` with `variant="persistent"`, and MUI never calls the `onClose` passed for that variant, so
  only the Clear/Close row and the floating button dismiss it. Below `sm` the same drawer is a
  `SwipeableDrawer` sheet instead, which does answer to `onClose` — Escape, a backdrop press and a
  downward swipe all close it — so the gap belongs to the wide layout alone, not every width.
- **No DOM or component tests.** `tests/` covers pure logic — converters, filters, the reducer, the
  chart data transforms, the cache round trip — and stops there; AGENTS.md explains the trade. Nothing
  verifies that a chart renders.
- **`.eslintrc.cjs` is dead.** ESLint 10 reads the flat `eslint.config.js`; the legacy file sits in the
  tree unapplied, and the flat config is the weaker of the two, dropping the type-checked and
  React-specific rule sets the legacy one enabled.
- **`PlainDate.valueOf` returns a string**, so every date comparison goes through `toString()` and
  allocates. The ordering is correct and deliberate (§7), but the timeline's greedy packing loop does
  tens of thousands of comparisons per layout. A numeric sort key computed once per interned instance
  would preserve ordering exactly, across mixed `Year`/`YearMonthDay` included; it costs a change to
  the most load-bearing class here for a win nobody has measured as necessary.
- **Omnibus has no library wall.** `common/Finished` keys a card with `finishedKey`, which falls back
  to the bare item name when the item carries no `releaseDate` — a rule that holds within one domain,
  where no two shows share a title, but not across a union where every season carries its show's name:
  a mixed wall would key those seasons identically and React would drop or swap the cards. A wall
  needs `OmniItem` to carry a release date, a banner and a start date for the shell's contract, an
  `aspectOf` callback so the height reservation (§6) generalises across banners and posters in one
  grid, and bucket semantics for the scroll marker across four conventions. Recently Finished (§6)
  answers the same "what closed, newest first" question.
