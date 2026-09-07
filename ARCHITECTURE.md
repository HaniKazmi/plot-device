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
│              │  sheets.values.batchGet (read-only scope)
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

There is no backend, no database, and no build-time data. One spreadsheet is the system of record —
four ranges, a tab each — and the browser authenticates, fetches whole ranges, and parses, joins,
aggregates and renders locally. Deployment is a static bundle pushed to GitHub Pages by
`npm run deploy`.

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
  composing         │  app/ — the medium registry                │
                    │  MEDIA · MEDIA_LAZY · LibraryProvider      │
                    └───────────────────┬───────────────────────┘
                                        │
                    ┌───────────────────▼───────────────────────┐
  domain            │  game/ · show/ · movie/ · book/ · omnibus/ │
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
**`common/` and `utils/` never import from `app/`, `game/`, `show/`, `movie/`, `book/` or
`omnibus/`.** Its second half is that **a tracked domain never imports another, nor the registry
itself** — all five compose nothing, and `app/` is the one folder that composes them, which is what
keeps it a composing layer rather than an arm of a cycle. A domain reads the rest of `app/`
downwards, its entry component asking `app/library.ts` for the library the shell fetched; the
registry is the one part of `app/` built _from_ the modules, so `game/module.ts` importing
`app/media.ts` is a real cycle, and `module.ts` therefore imports nothing from `app/` at all.

One file in `omnibus/` is a named exception rather than a loosened rule: `Graphs.tsx` mounts the
four `FranchiseContext` providers the card strips and the crossings read. The four are not one
shape — Books stands a second provider inside its own, for the epoch every book strip opens at —
and a per-medium provider member would have to be what each domain's _own_ `Graphs` mounts as well,
or the tree would hold two definitions of one provider. `tests/architecture.test.ts` enforces both
rules by reading the source across static, side-effect and dynamic imports alike, that one file
named as an exemption rather than left to slip the check.

The direction holds the other way too: **nothing in `app/` imports `omnibus/`**, that folder being a
tab like any other, so the shared half of a surface more than one tab reads — the gallery's
grouping, a mixed row's card size — sits in `app/` rather than inside one page's folder, where the
next reader has to reach across for it. `app/pageState.ts` is the single exception, naming the
composing tab's own `PageModule`: every other tab's arrives through its `MediumModule`, and the
Omnibus is a tab and not a medium, so the fifth page module is declared in that folder
(`omnibus/pageModule.ts`) and looked up here.

**`app/` is the medium registry** (`app/media.ts`): a `MediumModule` per medium, supplied by each
domain's own `module.ts`, holding everything the app asks of a medium that the medium itself is the
authority on — its data config, its guest rule, its arm of the union, the entry a franchise strip
draws it as, the store its tab's page state lives in, its artwork and its title. It is keyed by
medium over `app/records.ts`, so `MEDIA.game` takes games and nothing else: erased to
`MediumModule<unknown, unknown>`, one medium's guest rule type-checks against another's library and
the mistake is a page silently emptied. A surface holding four media reads `MEDIA[item.medium]`
rather than switching on it, and `tests/architecture.test.ts` forbids a `switch` on a medium
anywhere else: the compiler catches a missing arm only where somebody wrote the switch exhaustively,
and a fifth medium is otherwise an edit in every file that ever needed to tell them apart.

The registry is reachable from the shell, so it splits in two. `module.ts` is eager and holds what a
tab needs before it draws anything; `module.lazy.ts` holds the card and the hover card, and is
reached through `app/mediaLazy.ts` alone — a static table, so a wall of cards does not pay a round
trip per medium, and the one seam, so there is one answer to when a medium's chunk is fetched. It also holds the two answers the Now band's card is
made of, the medium's own election and the panel it states — what they answer is a card, and what
they read is the `cardData` and `statsData` that domain's card already imports. That
lookup is on a value the bundler cannot narrow, so the lazy half is held to those four members:
anything else exported there is weight on the chunk the union prefetches for its hover cards on
every visit. Nothing in `app/` imports `tabs.ts`,
because `tabs.ts` imports the five entry components eagerly and an entry component reaches the
registry: a module carries `tabId: string`, and the one component that resolves an id to a tab is
mounted by the shell, below both.

Generic components take behaviour as props and callbacks; domain folders supply the meaning. Where
the shared layer needs a domain vocabulary it declares its own — `utils/types.ts` owns a
`ColourableStatus` union that `show/types.ts` and `game/types.ts` stay assignable to, where importing
theirs would cycle, since both import `statusToColour` back out. `OmniItem` and `FranchiseEntry`
(`common/medium.ts`, `common/franchiseUnion.ts`) are the same arrangement one step further out:
each domain builds its own arm of the union, so the shape it builds has to be declared somewhere a
domain may import. `omnibus/` reads no sheet (§3), so it is the one domain with no converter.

## 3. The data pipeline

```
tabs.ts                    { spreadsheetId, range }
   │
   ▼
GoogleAuthContext          values.batchGet, one request for all four ranges
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
app/LibraryProvider        one call per medium, above every tab
   │                       → LibraryValue { raw, visible, items, loaded, error }
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

**The four reads are one request.** `common/rangeBatch.ts` collects every range asked for in a tick
and sends them together, which is available because the four ranges are four tabs of one file: the
provider mounts four hooks whose effects run in a single commit, so four separate reads would be
four requests and four quota units for what one `batchGet` answers. The gain is quota rather than
latency — the four were already concurrent against one host. The batch forms in a microtask, long
enough for a commit's effects to have queued every range and short enough that a caller arriving
alone still leaves in the tick it asked in; a range asked for later, by a tab mounted after the
others or by a refresh, forms the next batch. It is keyed by spreadsheet, so a fifth medium in
another document batches with itself rather than not at all.

The response holds one entry per requested range in the order asked, which is what lets each caller
read its own grid out by index — and is the whole of the coupling, so `fetchAndConvertSheet` keeps
its signature and every caller, cache key and per-medium error is untouched. One range failing is
the exception, and the cost is real: `batchGet` rejects the whole call, so all four media fail
together and each reports the same message — a Games tab naming a Books range. The range string is
a build-time constant, but it embeds a **sheet tab name** the spreadsheet's owner renames at will,
so this is a failure somebody can cause, and the trade is that against a request nobody pays for
four times. A grid that arrives empty is the other half: the batcher hands `undefined` up rather
than an empty grid, and `fetchAndConvertSheet` rejects it outside its own token guard, since a
converter reading no rows as a library with none would store that over the copy a cold visit paints
from and report a successful refresh doing it.

**A bad cell names its own row**, rather than surfacing later from a colour lookup or a chart offset
that names none. `common/sheetError.ts` holds the vocabulary — `sheetRow`, `describing`, `sheetError`
— and four readers over it: `readCertificate` rejects a certificate outside `Certificate`, `readGenre` a
blank, `readFullDate` a bare year where the model claims a day, and `readDatePair` a span logged at
two precisions. Two more sit in the converters that need them: Movies checks its `Format` and `Type`
cells against the two words each holds, and Games rejects an absent `Themes` column while allowing a
blank cell. `readGenre` defaults its argument, since the API ends a row at its last filled cell
and a half-entered row carries no `Genre` key; genre is also read before the dates to its right, so
such a row names its missing genre rather than a date.

Converters do real modelling work, not just field renaming:

- **`game/`** derives `company` from the platform string, folds a `"Party"` status into
  `status: "Endless"` plus a `party` boolean, splits `Themes` through `splitCell`, computes `numDays`
  from the date pair, and checks `Gameplay` through `isGameplay` rather than casting it past
  `gameplayToColour`'s neutral. The themes read rejects an _absent_ column while allowing a blank
  cell: 12 of 340 games honestly carry no theme, and `themes.includes("Adult")` is what guest mode
  hides on, so reading a missing column as "no themes" would put every adult game back on screen.
- **`show/`** nests a flat sheet: a non-empty `Title` cell opens a show, the rows after it are its
  seasons — safe only because `Title` is column A, an absent key being `!== ""` as well. Seasons from `EARLIEST_SEASON_YEAR` (2005) or earlier are dropped as untrustworthy, and a
  show left with none is rejected. Dates and episode and minute sums roll up to the parent, and each
  season is dated with a `lastWatchedDate` of its own: its end date once it has one — the day the
  finale was watched — and otherwise the `Seasons / Last Watched` cell, a column carrying the season
  count on a show row instead. The end date taking precedence is what keeps a cell nobody clears on a
  finished row from electing an old watch as the current one, and it leaves one field the hero is
  elected on rather than two the election would have to choose between. Its `Type` cell is checked
  against the sheet's own two words and stored as `anime`, a boolean: the column records one split
  and nothing else, so a vocabulary on the model would be two values standing for one question. A
  date-ordering mismatch is
  only a `console.error`; the `show` back-reference makes the graph cyclic (§4).
- **`movie/`** reads both its dates as full ones, a blank runtime as `0` and a blank Score as
  `undefined`: `sum` accumulates with `+`, so one `NaN` blanks every hours total, where a score is
  honestly absent rather than zero. `cinema` and `anime` stay booleans on the model but are read from
  worded cells and checked: a flag column written only in its true case has a blank for its false
  case and nothing to reject, where a worded column has none — so anything outside the pair would
  land silently as Home and non-anime, the second of which guest mode hides on.
- **`book/`** holds every date to a full one and rejects a `Status` or `Format` outside its two small
  vocabularies, which `statusToColour` answers `undefined` for and the status band drops silently. It
  requires status and end date to agree, and rejects a non-numeric page or hour count: a `NaN` blanks
  a total, a `0` lies in a sum. A blank `Franchise` becomes the book's own name, as the other sheets
  write a standalone work.

`show/` and `movie/` split their `Other Genres` cell through `splitCell`, which drops empty parts,
as `game/` does its `Themes`.

**The pipeline ends in one provider.** `app/LibraryProvider.tsx` is the only caller of `useData` in
the app: it reads each medium's `DataConfig` off that medium's `module.ts` (`gameDataConfig`,
`showDataConfig`, `movieDataConfig`, `bookDataConfig`, each exported from the file owning its
converter, with its version and — for Shows — the replacer/reviver pair) and resolves the module's
`tabId` against `tabs.ts`, which is the one place in `app/` allowed to (§2). A version bump therefore
has one caller to land at rather than six. It is mounted by `Google.tsx` inside `GoogleAuthProvider`
and above `NavBar`, so the bar, the search palette, a card's franchise strip and all five tabs read
one copy of the library.

The four `useData` calls are written out rather than walked over the registry, because a hook called
in a loop or a callback is a rules-of-hooks error. The walks that are not hooks go through
`eachMedium`, whose callback is generic in the medium: an array of the four modules relates a module
to no particular library, where one visit at a time holds a module and the records it actually
takes.

`LibraryValue` (`app/library.ts`) is what a tab reads. `raw` is what each converter produced;
`visible` is that with guest mode applied per library by each domain's own rule, which is where the
mode belongs — it hides content rather than narrowing a view, so an index built before it would put
a hidden item back on screen through a card strip. Both are `Partial`, the sheets landing one at a
time, so a tab whose own sheet is here paints from it rather than waiting on the other three.
`items` is the union, present only once all four libraries are (`completeLibrary`) and built once,
since two flattenings of one library are two chances to disagree about which rows guest mode hides.
`loaded` and `error` stay per medium, so **each tab keeps its own `DataLoadedSnackbar`**: a Books
converter error belongs on Books, and the Games tab's "Refresh Complete" must not wait on three
other sheets. The Omnibus reads all four, and the first error of the four (§4).

Omnibus runs no pipeline of its own, and neither does any tab: `app/library.ts` flattens the four
through the registry, each medium's arm supplied by its own `module.ts` (§2) — which is why `Show[]`
flattens at the season, the unit actually watched, carrying the show's name, genre, franchise and
certificate onto each. A book has no certificate, so `OmniItem.certificate` is optional and every surface
grouping on it drops books.

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
second read; the entry clears on settle, so a failed fetch is retried by the next mount.

The fourth return value is the way to ask again. It drops that domain's cached copy and bumps a
count of the reads asked for, which is in the effect's own dependencies — so the effect reruns,
finds no copy and fetches. A count rather than the `dataLoaded` flag, because the effect reruns on a
dependency that _changes_ and that flag is already false for a domain whose read failed: turned back
there it is a same-value write, so the retry after a bad row — the one press this exists for —
would issue no request while clearing the message saying why. `dataLoaded` and `error` are still
turned back, being what the page says about itself while the read is out. Called from a press rather
than an effect, which is what lets it set state at all. `localStorage` is left standing, since
emptying it would blank the next cold visit for the window before the replacement lands, and
`IN_FLIGHT` too: a request already on the wire is one a refresh joins rather than duplicates.

`LibraryProvider` composes the four into `refresh` on `LibraryValue`, beside the `loaded` and `error`
it already assembles, and derives `reading` from them — a token, and a medium that has neither
landed nor failed. Both live there rather than in a module global because the bar is inside that
provider, so there is a common ancestor and nothing to reach past. It also means `loaded` stops being
a latch, and the refresh notice each tab already keeps fires on a refresh as it does on a first
load.

The third return value is what went wrong. A gapi rejection is the response object rather than an
`Error`, so `describeFailure` reads `result.error.message` — the converter's own message, naming the
row, item and column. `DataLoadedSnackbar` holds it until dismissed and leaves the stale copy
standing: last week's data beside the row to fix beats an empty page. Its "Refresh Complete" fires
for a `false → true` turn it watches after mount, so a caller keeps it mounted at a stable position
across that turn. It watches the turn rather than latching on the first arrival: a refresh takes the
flag false and true again, so a latch would answer a cold load and then stay silent for every
re-read on the one tab the reader is standing on. Below `sm` it stands above the bottom tab bar (`BOTTOM_TABS_CLEARANCE`,
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
   the domain's reviver running in the same guard — the hook is called from `LibraryProvider`, above
   the page's own error boundary (§10), so a throw here takes the app down and not just the page.

Cache keys are versioned per domain — `dataCacheKey(domain, version)` yields `game-data-cache-v3`,
`show-data-cache-v6`, `movie-data-cache-v4`, `book-data-cache-v2` — and `dropSupersededVersions`
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
- **Failure handling.** A rejected read clears `tokenSet`, putting the key back in the bar,
  so mid-session expiry self-heals into a re-prompt. **Only the request is guarded**: a
  converter throw travels on to `useData` instead, since clearing the token would make a data fault
  look like an auth fault. A refusal — GIS delivers a dismissed consent popup to the callback a grant
  arrives on, carrying `error` and no `access_token` — is rejected by `isGrant` (`contexts/token.ts`)
  before it can leave the app reporting itself authorised on a credential-less token.

The requested scope is `spreadsheets.readonly`; there is no write path by design. `authorise` and
`revoke` are exposed as `undefined` when unavailable, so which of them exists _is_ the token, read by
presence rather than through separate booleans.

**What the reader is told is a fourth thing, and it takes the cache as well as the token.**
`app/authState.ts` answers `live` · `authorising` · `stale` · `empty`: neither callback present is
the loading state whatever the cache holds, `revoke` present is live, and only then does the cache
decide — some library with a copy behind it is `stale`, none at all is `empty`. Presence alone, never
`useData`'s `loaded`: a reader who revokes mid-session, and a failed read that cleared the
token, both leave rows on screen this session did fetch and can no longer refresh, which is what the
key's dot is for and what reading `loaded` would blank the page over. The auth context sits above the
library provider and knows nothing about the cache, so the derivation is a hook below both — which
the bar and the page body are, `Google.tsx` mounting `LibraryProvider` above `NavBar` for it.

The bar draws one thing about all this, in one slot beside the search button at every width: an
authorise key while there is something to authorise — a dot on it while the page is stale, its word
beside it from `md` up with a fine pointer — and, once the session is live, a refresh in its place.
The two are the same control at two states of one question, which is why they share a slot: a
session holds its sheets for as long as it lasts, so without the second there is no way to re-read
them but to reload the page, and an installed app offers no handle for that at all. It spins and
disables itself while the read is in flight, that being the whole of the report — the rows do not
blank, and a page of last visit's data is what stands until the new ones land. Everything
else is behind the `⋮`, which is drawn at every width and pointer: the tab's Sheet, Revoke, and
guest mode in both directions. One list and one surface, so nothing is reachable at one width and
not another — an iPad held sideways clears every width test and still points with a finger, and a
mouse at 1440 has no other way out of guest mode. The dot is all a stale page is told: the rows are
last visit's and one press refreshes them, which a line of chrome under the bar states at the cost of
a strip standing over every page for the whole sitting. `app/EmptyCard.tsx` is the exception, for the
`empty` state, which `Google.tsx` renders in place of the `<Outlet>`: with no cache and no token
there is no fetch to fail, so the snackbar has nothing to report and the card is the only thing that
can say what to do.

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
series of its own from nothing. Where the reader's own settings are what emptied it, it draws
`common/NothingMatches.tsx` — what emptied the page, and that setting's own way back — in place of
the "nothing to plot" line; a library with nothing in it and nothing to blame draws the plain line
instead, since there is no choice to undo. `Sunburst`, the packed `Timeline`, `FoldedChart`,
`Finished` and `StatList` answer the same way for the same reason, each drawing it in the body at a
modest height rather than the chart's own `80vh`.

**Which of the two it is, is the page's answer and not the chart's.** `common/nothingMatchesContext.ts`
carries whether the page's own settings have left it with no rows at all, which of the two did it —
a filter, the year scope, or both — and the dispatch that undoes each. The message names the one
that emptied the page and offers exactly its way back: "Nothing matches these filters · Clear
filters", or "Nothing in 2019 · Show all time", the scope stated in the words its own picker wears.
A reader told the filters emptied a page holding none has been sent to look for a control that is
not lit. `Google.tsx` provides it once above the outlet, from the current
tab's page module — one pass of that page's own predicate over its library per filter change, the
same figure the box's footer states — and every shell asks it at the empty branch it already has.
Handed down instead, it is a prop threaded through sixteen domain wrappers that never look at it,
and a shell added later is silently the one that says nothing. Asked at the shell's own empty
branch rather than in place of it, a chart emptied by a control of its own — the games timeline's
2015 floor, a grouping that yields no rings — still states that in its own words while the page
around it has rows. The Omnibus gates each of its sections on having something to draw, so it draws
the message itself where they would stand.

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
picker per level joined by `›`, "Nest by" the first picker's own `label` rather than a caption
beside the row, humanised through `keyLabel` (`utils/stringUtils.ts`). Domain meaning enters through
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
order — the names under the bar say which segment is which regardless. The three pickers appear with the wheel they re-nest, a folded
card having nothing to nest: shown, the row asks for more room at 390px than the card holds and
scrolls under the title (`SectionHeader`'s `ActionRow`, above) with the "Nest by" label intact
rather than either wrapping the row or dropping the word.

### Timeline — `common/Timeline.tsx`

Hand-rolled SVG rather than Highcharts, because what is wanted is a Gantt-like packed timeline with
rich hover cards. Two algorithms:

- **Greedy interval packing** (`packRows`, `common/timelineLayout.ts`): sort by start date, place
  each item in the first row whose last item has ended. Items are linked to their row neighbours
  (`previousDate` / `nextDate`), so the layout step knows how much empty space surrounds a bar.
- **Derived text placement** (`placeLabels`): one pass over the rows decides per item whether the
  label fits inside its bar or spills into the gap left or right, tracking per row whether the
  right-hand gap is claimed. Labels live in a `<foreignObject>` spanning the whole gap, so they
  overflow the bar without being clipped. Nothing is read off the DOM: the bar and its gaps are
  already percentages of the grid, and the label's own box is
  `round(measureText(name) + 2 × LABEL_PADDING)` — the label is `white-space: nowrap` inside
  `overflow: hidden`, so what it reports is its glyphs plus the padding either side rounded to the
  pixel, which a canvas answers exactly given the same font, and the font is `system-ui` so no
  webfont can arrive late and change it. Asking the DOM costs two renders of the whole chart, since
  the measurement can only be taken after a commit and only while every label still wears the
  default placement — a placed label reports the width its own answer pinned it to. `useElementWidth`
  supplies the one pixel figure the arithmetic needs, off the grid's own box: `GRID_WIDTH` is a
  `vw` length, so the viewport agrees with it until the grid's scroller takes a classic scrollbar
  or a fractional device pixel ratio lands the box off a whole number. The viewport is still the
  first guess, since that hook answers `undefined` until it has measured — but it reads in a layout
  effect, so the guess is drawn for no frame the reader sees.

The chart is fixed at `GRID_WIDTH` (four viewports) inside a scroll container, the month/quarter/year axis beneath it.
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
`show/Timeline.tsx`, `game/Timeline.tsx` and `book/Timeline.tsx` draw it through a plain
`SectionHeader` and `Card` — since a folded card would show only a picture of a Gantt chart's shape,
no cheaper a reading than the chart itself.

The hover card that names a bar reaches it two ways: through the label, which already re-enables
its own pointer events, and through the bar's own `rect`, so a finger aimed at the item and not at a
label sitting in the gap beside it still lands on something.

Both take the press as well, because the card here does not. Marks stand a row apart and the card is
500px wide, so a card opened over one row covers the several below it: a reader running the pointer
down the chart hits the card instead of the next mark, and the card is about the row they have
already left. It asks for `transparent` and ignores the pointer, which costs the crossing — the way
a mouse otherwise reaches the picture inside and through it the item's own layer — so the mark gives
that back on a click. The chart holds a thunk that renders the domain's hover card and knows nothing
of the item inside it, so it mounts that card off-screen and asks it to open whatever layer it owns
(`common/cardAutoOpen.ts`): a book's expanded card, or the drill-down a card standing for a group
opens instead, which is how a series bar on the Books timeline opens the series rather than the book
whose cover fronts it. The host is the shape the search palette opens a hit's card through, keyed on
the press so the same mark pressed twice mounts a fresh card rather than reconciling with the one
whose layer has already closed. The signal stops at the card that takes it, or every card that one
draws — the members of the shelf it opens, the marks on the franchise strip inside an expanded
card — reads the same signal and opens itself on top.

A finger is untouched: the sheet installs its own press over the mark's, which is the right way
round, since a tap is asking for the sheet rather than for the layer beneath it. `useCoarsePointer` is read once per
chart in `TimelineGrid` and passed down as `coarse`, rather than mounted per mark — a few hundred
marks would otherwise be a few hundred subscriptions answering one question that cannot differ
between them (§ Phone and tablet). The row's own `&:hover` scale sits behind `(hover: hover)`, as
every bare hover rule here does: a tap has no leave event, so the last bar touched would
otherwise stay scaled up until another tap lands elsewhere, reading as a selection the chart never
made.

Two details are load-bearing. The label `Box` sets `lineHeight` to `BAR_HEIGHT`, sitting in flow
with no `top` and so centred by its own line box alone: a bar height changed without it puts every
label off-centre. It is offset along the row by a margin rather than positioned, because an SVG
`foreignObject` establishes a viewport that Chrome resolves a `position: fixed` descendant against
and WebKit does not — positioned, every label paints at its offset from the browser window's own
edge and stays there as the chart is scrolled. And the hover step on a bar is instant — a CSS transition there is created
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

The fifth tab, and the one with no sheet of its own: every surface is a `common/` shell fed the
union (`OmniItem[]`, built in `app/`) instead of one medium's rows, so the page speaks the four
tabs' own vocabulary rather than inventing a mixed-media one.

**The Now band** (`omnibus/Stats.tsx`) is what no single tab can show: what each medium is currently
on, side by side. `electNow` walks the registry rather than the four domains: each medium's
`module.lazy.ts` holds its own election — `currentlyPlaying`, `heroSeason`, `latestWatched`,
`currentlyReading` — beside the `nowPanel` saying what that card states, so a card
cannot disagree with the hero its home tab shows and the band dispatches on no medium anywhere. The
walk takes the registry as a parameter, `adapter.ts` being a pure module that four card trees have
no business in. `visible` keeps a medium switched off in the box's This page mode from being asked
at all. A medium with nothing in flight contributes no card; with none in flight, no band — a rule
Shows and Movies answer by having nothing to be in flight, a film being finished the day it is
started and a show's last watch being a date every finished season carries. The
phone's cell order — the book under the game, the film under the show — is a list of media beside
that walk rather than four literals in the tree.

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

On a phone the band is two columns rather than four cards, and each cell is a picture and a date
and nothing else: a card that fills the width is as tall as its own artwork, and four full-bleed
pictures would put the last of them two and a half screens down, where four rows short enough to
share a screen leave a poster 54px wide. Each column is a banner over a portrait — the game over
the book, the show over the film — because the two shapes stand at different heights, 131px and
204 at 390, and only a column of one each comes out the height of its neighbour, 343 both, so no
cell is padded, stretched or left beside a gap. A multi-column box balances the four into those two
columns by itself, which keeps the cells one flat list keyed on their media, so a turn past `sm`
reorders them in place rather than rebuilding them and closing a card the reader had open; `Now`
reads `usePhone` as a value for that order, which no `sx` can state. A banner spans its cell at
16:9 with the date on a line beneath; a poster or a cover stands beside a 36px spine
(`NOW_SPINE_WIDTH`, `nowGeometry.ts`) with the date set down it as a book's spine is. The portrait
cells are one height, the poster's at the width the spine leaves it, solved from the measured row
(`nowPortraitHeight` — 204px at 390, 234 at 430), so a wider phone gets a taller picture rather than
ground beside one; the cover is held to the same height and takes its own width inside it, its spine
absorbing what a cover narrower than 2:3 leaves. A cover wider than the poster's ratio cannot fill
both the row's height and the width the spine leaves, and stands contained in its column with the
ground above and below — the one picture on the page not edge to edge, since the spine's 36px is
the floor a date reads at and the alternative is the card clipping the date. The date is bare —
"1 Aug 2026", never "Since" — because a 280px cover screen gives the cell 120px and the spine 108
of run, and the ground already says which medium's date it is; `NowDate` reads the card's own
arrangement for which edge it stands on, as every footer does, so the cell passes `shape`. A column
that narrow holds a date and not a word, and the date is the one fact of the four a picture cannot
carry; the platform, the genre and the figures are one tap away on the expanded card, which the
whole cell opens (`openFromCell`): a finger on the spine does what a finger on the picture does. A
press inside the card's own action area is left alone, that button carrying the card's press itself
and answering the keyboard with it. A medium with nothing in flight leaves its column a cell
short, and the columns then differ by that cell's height. From `sm` up the cards stand two to a row, the share solved
from the measured width as the four-way one is (`pairNowGeometry`) and capped at the stated card,
which it reaches from a 876px row. The share is unconditional: a card wider than half its row can
only stand one to a row, so refusing a narrow share would hand a 558px row four rows of the stated
card, 1,544px against the 590 the same row's pair costs.

**Mixed rows are one card size, the Now band's rule at strip scale.** A list lays its cards out one
of two ways (`CardLayout` in `common/Stats.tsx`): a grid at stated column spans, or a sized row.
Recently Finished and the gallery's drill-downs take the second, handing the shell a `rowSizing`
(`MIXED_CARD_SIZING` in `app/cardData.ts`) in place of spans — a union rather than two optional
props, so a sized row is never handed spans it cannot read. The caller states only what it knows: a
minimum width of 280, a 206px poster beside a 140px column wide enough for a date and a two-line
title, and the picture's height at a width, the banner's. The shell adds the medium band, the
one-line footer under a banner (`ROW_FOOTER_HEIGHT`, 65, on the card's `rowSize`) and the border,
then measures the row and shares it between as many cards as fit (`common/rowSizing.ts`) so a whole
number fill it — measured rather than stated at breakpoints, because the drill-down dialog spans the
viewport.

That band names the medium along the top of the whole card (`CardMediaImageProps.mediaBand`), the
card's first child, rather than a chip covering the artwork; on a row-laid card it takes a line of
its own and adds no width to the picture and words under it. `app/mediumBand.tsx` builds it once
per list at a stated `MEDIUM_LABEL_HEIGHT` of 22, so the shelves, their drill-downs and Recently
Finished cannot draw it at different heights — stated because those surfaces fix a card's height and
the artwork takes the rest.

**Recently Finished** (`omnibus/RecentlyFinished.tsx`) is the list each tab keeps for itself, asked
once across all four: `recentlyFinished` keeps only items with a `closeDate`, since an item in
progress is not finished — and that filter leaves every entry with a date to sort by, where
`sortByKey` puts falsy values first in both directions. Its cap is stated in rows (`collapsedRows`,
two), since how many a sized row holds follows from the measured width. Collapsed, that cut is the
card's own control — "All 1,794 ›" — so the header states nothing; the dialog, whose control is the
way out, states the cut its own 500-card cap still makes as a figure. The library wall
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

**The gallery** (`omnibus/Gallery.tsx`, `app/galleryData.ts`) shelves the union by genre,
franchise, certificate or decade, each shelf a `common/Filmstrip` with a drill-down behind the worded cut
at the end of its name row — the shelf holds twenty pictures of a group that can run to hundreds,
and the figure is what says so as well as what opens the rest. It
opens on franchise, newest first — the series met lately, which the genres band does not answer. A
shelf card carries no words, so the picture keeps the whole height below its medium band.
Every category but rating is a field all four media record — `groupByCategory` skips an empty value,
so a category one medium answers `""` to drops that medium off the wall with no error. The
certificate is the exception: nothing certifies a book, so books are absent from those shelves and
from the certificate
split rather than shelved under a certificate nobody issued. It groups on `certificateBand` and not
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
question of the union: one proportional bar per row, split by how it divides between the four
media, counted in the rail's measure — under Hours a genre reads as mostly games wherever the games
are long, under Items every entry weighs the same, and the rail is where the reader asks which. A
select picks what a row is (`BRIDGE_KEYS`): genre, which the section opens on, or the year, decade
or certificate tier, the vocabularies the gallery already shelves by, each row wearing the swatch
that vocabulary has elsewhere on the page and a year its decade's. Franchise is not offered, for the
By year chart's reason. Genres run biggest first; years and decades newest first; certificates
youngest first through the shared `AGE_BANDS`, the order the boards print them in, so the bridge
cannot order the tiers differently from the colour ramp. A book carries no certificate and drops
out of that view, as it does off the certificate shelves. Only the primary genre counts, since two media
carry secondaries. A row held by one medium is a solid bar rather than held back until a second
arrives — requiring the crossing puts a cliff in the section, Abstract being 136 hours of games
that a single abstract film would admit at full size — and the bar states the confinement the cliff
was hiding. A row whose every entry logged nothing is dropped; a medium contributing nothing gets no
segment, because `assignPercents` floors every slice at half a percent and a visible slice of
nothing is a claim the data does not make. The hover dim is one piece of state for the whole card,
turning a stack of bars into a comparison read down the column, and is optional on both
`ProportionalBar` and a row for the same reason: folded on a phone, the card states its leading row
by name, figure and media count, drawing that one row as the fold's preview, with nothing to dim it
against.

**Franchises over time** (`omnibus/crossingsData.ts`, `omnibus/Crossings.tsx`) draws each franchise
met as a strip, one lane per medium present, packed by `common/timelineStripData`'s `buildStrip` as
a show's season strip is, so the two cannot disagree about what counts as an overlap. Lanes are
absolute: each medium is packed on its own and offset past the lanes already spent, so a renderer
never works out where a medium's rows begin. Reaching a second medium is not asked of a franchise,
that cliff hiding the largest series on the page — thirty seasons of Doctor Who behind the absence
of a Doctor Who game. The twelve biggest are drawn in the card (`STRIPS_SHOWN`), the rest behind its
own worded cut. A franchise groups on the raw franchise column, as `movieFranchise`/`showFranchise` do, so a
series' founding entry keeps naming itself as its own tab draws it; `namesTheSameThing` drops a group
where _every_ entry repeats the name, that group having no series structure to draw a lane for. That
one test holds the section to series: 588 franchise values are 169 series by it. A film is a point
(`start === end`), floored to the strip's minimum band width; a bare-year game date draws its whole
year, marked `precise: false`, rather than the share `game/cardData.ts` estimates from the whole
library for a single game's strip. The `epoch` is the earliest _start_ drawn, floored to that year's
1 January: an attribution year is the year an item ended, so a scale opened on it clamps every
earlier start against the left edge, and a mid-month epoch puts every year line off by the
difference.

The section is an `ExpandableCard` whose dialog draws every franchise, in stacks of the same twelve:
one scroller per stack rather than one for all of them, a scroller being what holds a shared scale
true and twelve strips being as much of one as a screen shows. The card's own control reads "All 180
›", so the cut is both visible and one press away, and the header states no count — the strips are
the page's own franchises and the packed reading is the page's own population, which the rail
states. On a phone the card folds inside itself (`FoldedContent`, the fold without the `Card`
`ExpandableCard` already owns).

The header's Franchises · All switch trades the strips for the packed timeline the Games, Shows
and Books tabs draw one medium at a time, over the whole union: `omnibus/timelineData.ts` maps
each item to a row through the crossings' own `crossingSpan`, so the two readings cannot disagree
about when an entry ran, coloured by medium and hovering to the same dispatcher. A game logged
with a bare year is left out rather than drawn as a year-long solid bar — the strips dissolve such
a span under a mask that says so, where a packed row has no way to mark one as an estimate. That
reading draws every row it has, so the card offers no expansion under it. The rows are built only
while that reading is chosen, and the
choice lasts the visit. `TimeLineChart` is exported from `common/Timeline.tsx` for it, the chart
without the card the section already stands in.

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

`app/CardMediaImage.tsx` is the `TypedCardMediaImage<OmniItem>` every one of these surfaces, the
search palette and the franchise view render through: it dispatches `item.source` by `item.medium`
and passes `mediumToShape` down, so a picture opens that domain's real expanded card, strip and
ledger, and only a mixed row arranges itself per item. `OmniHoverCard` beside it dispatches the same
four ways, so a hovered mark shows the card its home tab would show rather than a fifth assembly of
one.

### One control idiom for "how is this drawn" — the control kit

Every control on the page is one of five parts. Four are stated once as a theme override in
`Google.tsx` rather than at their call sites — a **segment** (`MuiToggleButton`), a **picker**
(`MuiButton` at `size="small"`), an **action icon** (`MuiIconButton`) and a **rail chip** (`MuiChip`
at `size="small"`) — and the fifth, the **sheet bar** every layer opens with, is a component of its
own (`common/Card.tsx`), since a bar is a shape rather than a size. One type size, 12px
(`CONTROL_TYPE_SX`, `common/typography.ts`), and one height per surface: 28 in a card header, 24 for
a chip in the rail, and 32 for every part under a coarse pointer, where the type stays put and only
the target grows. A control is a rounded rectangle at 6px and a chip is a pill — rectangles change
how something is drawn, pills take the reader somewhere. All of them answer a keyboard the same way,
a 2px ring in the tab's primary outside the part's own edge, so the focus is one mark rather than
whatever each MUI component draws. The app bar is the exception it states itself (`BAR_BUTTON_SX`,
`NavBar.tsx`): a filled bar with nothing beside its buttons to be level with, where a 28px square
reads as a control that shrank.

`CutButton` is the picker's sibling: a worded action reading a `common/population.ts` `all(total)`
with a chevron, on the same button the picker is drawn on and stating the same edge in `sx`, since
the theme gives a small outlined button MUI's own half-strength primary. Wherever it stands on a
card's own footer the footer restates its colours from the artwork palette — a control grounded in
`background.paper` on a sampled ground is a rectangle of the page's paper inside a coloured card.

`SegmentedControl` is a small closed set of named states, and every surface offering one uses it:
the barchart's four views, the gallery's shelf order, the wall's density, the Shows timeline's
Seasons · Shows, the Books timeline's Books · Series, the Games timeline's With party · Without,
and each tab's measure in the section rail — the last through `MeasureControl`,
which owns the wiring to the filter reducer once for the five tabs. Values that are already their
own words become options through `common/segments.ts`. Words rather than icons, an icon being a
legend nothing on the page teaches. A press on the lit segment is ignored rather than clearing it.
The franchise strip's Order · Time switch passes a `tone` — `SegmentTone`, the artwork palette's
`ground`, `onGround`, `line` and `tile` — because the theme's primary is solved against the theme's
paper and on a sampled ground can land a hue away from legible: toned, the lit segment takes the
surface's ink with its word in the ground, the unlit words that same ink at full strength, and the
rest of the control the surface's own ground in place of the paper the theme would give it — the
muted tone being a transparent ink too close to a mid-toned ground for a 12px word to carry.

`SelectBox` is the picker: a button opening a `Menu`, not a `Select`. A select is a form field sized
by MUI's input metrics, where every one of these stands beside segments in a card header, so as a
button it takes the kit's own height, type and corner and a header holding both reads as one row.
Options that are model keys are humanised by `keyLabel` (`utils/stringUtils.ts`) unless the caller
passes its own `labelFor`, which is what the menu items are worded by — sentence case, `startDate`
reading "Start date". `label` names what is being chosen where the card's title does not, muted
beside the value; `defaultValue` is what the page opens on, and given it, the control takes a lit
border and wash once the reader moves off it, which is the one thing a picker cannot say by its
value alone.

### The page's controls, Top lists and drill-down — shared shells

**A page's filters live in the box above it** (§ Search), not in a surface of their own. The two
handles are in the section rail: from `sm` up `FilterChip`, in the rail's `population` slot, whose
**word is the page's population** — "309 shows", `stated(filtered.length, module.noun)` computed
once in each tab's `Graphs` — with a badge for how many fields the reader has changed; below `sm`
`PageChip`, the picker-shaped chip reading the measure with that same badge, since a 358px rail has
no room for the figure (§ Page architecture). Both live in `common/PageHandles.tsx` and both call
`openPage()`, so the figure and the controls that moved it are one object and the rail is the one
surface pinned at every scroll position, where a floating button stands over whatever the page is
showing and, at the bottom right of a phone, under the browser's own toolbar.

The badge counts the fields the reader has changed (`activeCount`, off the tab's own `PageStore`):
every chart is drawn through those filters, so a library narrowed to one franchise otherwise looks
exactly like the whole library. The measure and the year scope are not among them — each is a
control of its own with its own lit face, and a badge counting them would report a choice its own
surface cannot undo.

What the box draws is `common/FilterControls`' `SchemaPageControls`, over the tab's `FilterSchema`
(§7) rather than a list written out per tab, so every surface offering a page's filters offers one
description of them.

`common/DrilldownDialog` and `ExpandableCard`'s own dialog (below) both open with the `SheetBar`
every layer wears (§ The expanded card): the name of what was opened and a ✕, pinned at the top at
every width, since a fullscreen dialog covers the handle that opened it and a grid five hundred
cards deep leaves the reader nothing else to press. Both also take an `onClose`, so Escape and a
backdrop press close them like any other dialog. Neither header carries a way out of its own: the
drill-down states its group in the bar alone, and the expanded list keeps its `SectionHeader` for
the controls that live in it, which costs one title stated twice.

`common/TopList` exports `TopCategoryBand`, the row of "Top X" cards a tab opens on. The card owns
what is the same everywhere: the category select, `topNWithOther`'s top-five-plus-Other reduction
(`common/statsData`), the proportional bar with its ranked legend and shared hover dim, and the
colour policy — "Other" is the neutral bucket, a group whose domain has a vocabulary wears it, and
one without takes a palette colour offset by the option's index, so switching category recolours
consistently. A domain supplies its option list, whose order feeds that offset, an icon per option,
how to group, and its vocabularies.

`common/GroupedStatList` is the strip of grouped cards that drills into a group. It owns the
drill-down's card keys, which the category prefixes so a change of grouping remounts the grid, and
the rule that **the whole card opens the group, at every width** (`CardMediaImageProps.onOpen`,
which replaces the item's own detail dialog): the picture fronts the group rather than being an item
of it, so the press has one meaning — and the press is the card's own action area, a button, so
Enter on the focused card opens the group where a handler on the picture inside it would answer the
pointer alone. What says so is a › at the end of the footer's closing row (`FooterComponent`'s
`chevron`, in the footer's own artwork tones), following the handle rather than asked for
separately, so the two cannot disagree; on a phone's strip card, whose footer is a caption of two
fixed lines, it rides the closing line — the figure, and the shorter of the two, so the date above
keeps the card's full width. It is a glyph and not a worded button because a
button there stands the footer a row taller than the plain `StatList` beside it — the two cards
sharing a `StatBand` row then end 30px apart — and it sits outside the row's own flex box, which wraps
between its cells and would otherwise give a long group's name a second line the short names do not
take. The card names what it opens (`openLabel`, "Open Fantasy, 116 games"), since its `alt` and its
words between them name the group's biggest member — the one item pressing it does not open. It
sorts the picked group at open rather than every category on every render, and mounts
`common/DrilldownDialog`, the fullscreen list itself, only while a group is picked. The franchise machinery is shared the same way: `common/franchiseIndex`
groups by whatever accessor a domain passes, and `common/franchiseContext`'s factory threads the
index down to the card strips.

### Search and the page's own filters, as one box — `common/SearchPalette.tsx`, `app/Search.tsx`

**One box with two modes.** _Find_ is the search over all four libraries; _This page_ is the
current tab's own settings and filters. They are one surface because they answer one question in
two directions — a reader typing "comedy" is asking either for the thing called Comedy or for the
page narrowed to it — and because a filter surface with no keyboard route and a box with no tap
route are two half-controls.

**The handle decides the mode.** The magnifier in the app bar, ⌘K and `/` open Find with the
keyboard up; the rail's population chip (`FilterChip`) from `sm` and its measure chip (`PageChip`)
below it open This page with the keyboard down (§ The page's controls). ⌘⇧K switches an open box
and opens a closed one in the other mode; ⇥ inside the box switches it, but only where focus is in
the input or on the mode segment — a menu inside This page has to stay walkable out of by keyboard.
The keyboard is asked for on the mode _and_ the request count together (`common/searchOpen.ts`), so
a switch **into** Find raises it and opening This page does not; switching the other way blurs the
field, since a reader who typed in Find still has the caret in it and on a phone that is a keyboard
standing over the lists the switch was made to reach.

The chord puts the caret in the box with the last query selected even where the box is open already
— whatever a hit opened may have taken the focus with it — and from inside the field it closes it,
so the store counts requests beside the flag. The button is in the bar and the box is mounted inside
`FranchiseUnionProvider`, a sibling subtree below it, so the flag, the mode and the count live in a
store outside React: lifted to their common ancestor they would re-render the bar, the container and
every tab on each open. `/` still opens Find outside a field, and the box's own field is one of
those fields, so a slash typed into it never reopens it. Everything the box draws with — the shell,
the index, the four domains' cards, and the renderer every tab's filters are drawn by — is one lazy
chunk (`SearchSurface`), prefetched on mount as the hover card is.

The shell is domain-blind: it takes groups of already-shaped hits, This page's rows as one node,
and a footer, and owns the input, the mode segment, the keyboard (↑↓ through every hit as one list,
↵ on the selected, the first selected as soon as there is one) and the two
arrangements — a dialog seated near the top from `sm` up, and below it a fullscreen sheet whose
pinned bar carries the mode segment where every other layer carries a title, since what the box _is_
changes with it. No grabber there: a fullscreen dialog is not a swipeable sheet, and a grabber would
offer a gesture that does nothing. A row is lit by one `selected` flag for keyboard and pointer
alike — the pointer moving onto a row selects it — since a tap has no leave event to unlight a hover
of its own.

**This page** (`common/FilterControls.tsx`) draws the current tab's schema as rows: the measure
("Count in") and the year scope ("Years") first and ruled off, being readings of the whole page
rather than narrowings of it, then the toggles as chips, then one row per category. A category
**expands in place** into its values as chips with counts, so a value is a tap and never a portalled
menu item a thumb has to aim at; a `searchable` category — the authors, directors, publishers and
series a library holds hundreds of — opens a field and a scroller instead, two hundred chips being
no list anyone scans; there the values chosen lead the list whatever is typed into that field, since
a phrase names what the reader is looking for and not what they have already picked, and the chips
are the only place a choice is shown or taken back. A category with a colour vocabulary keeps its
swatch on the chip, so a chip and a wedge naming one value are one colour, and a category holding a
selection ends its row in a clear of its own — the footer's Clear undoes every category at once,
where taking one back otherwise means opening it and pressing each lit chip off. Both halves of a
category, its vocabulary and the figure inside each chip, come off one scan of the library apiece
(`categoryTally`), cached against the schema and rows they were built from: the surface is rebuilt
on every letter typed, and the compiler's scope for anything in it depends on that query, so a
library of fifteen vocabularies would otherwise be fifteen passes over every row per keystroke. The
footer states `narrowedTo(population, activeCount)` beside the Clear that undoes the second half.
With something typed, the same rows narrow: a category shows the values matching the query and one
matching none is dimmed and stays shut, so the single field narrows the lists as well as the
libraries.

Which tab that is comes from `app/pageState.ts`'s `pageOf(tabId, library)`, the one file in `app/`
that may name the composing tab: it answers with that tab's schema, its store, its measures, the
noun its population is counted in, the rows its lists are built from and the floor its year picker
offers. All five come off a `PageModule` — four of them a `MediumModule`, which extends it, and the
fifth the composing tab's own — so the lookup has no branch in it and the box never learns which is
which. Where a tab's rows are is the one answer a module cannot give, `library` being a shape in the
composing folder that a domain module reaching for would cycle, so `PAGE_MODULES` pairs each with
that accessor: a medium's visible slice, the union for the composing tab. `pageCount` states the population through the same composed predicate
the charts are drawn by, so the box's footer and the rail's chip cannot arrive at two figures.

**Three kinds of hit.** _Places_ are the other tabs, offered as a "Go to" line of chips — all of
them before anything is typed, whichever the query names once something is. _Things_ are works and
franchises. _Attributes_ are a genre, network, platform, author, director, certificate, decade or format,
each with its count in each medium: `buildAttributeIndex` (`app/searchData.ts`) walks every medium's
own schema over that medium's own rows, so the box can only offer a narrowing that tab's controls
actually draw. A category states which of its values are worth finding through `found`, defaulting
to all of them: a split names its category after the half a reader looks for and offers only that
half, since a shelf of "Show" on the Shows tab is the tab, and its hit would stand beside the Go-to
chip of the same name saying nearly the opposite. Shows' and Movies' anime selects are keyed and
worded alike — which is what the shared `animeCategory` is for — so the two fold into one entry with
a count in each. Franchise states the empty list and is scanned from the franchise index instead,
the column being mostly works naming themselves — 168 values in the games sheet
alone. The certificate is grouped on
`certificateBand`, the gallery's own rule, so `15` and `16` are one hit; what it _sets_ is whichever
notations that tab's rows carry, which is why an entry keeps its values per medium.

**An attribute hit knows which tabs carry its category, and ↵ does the nearest thing.**
`attributePlacements` expands one entry into a hit per tab, the tab being read first: on a tab whose
schema holds the category _and_ whose rows hold the value it stands under "Filter this page" and ↵
narrows the page in place; on any other it stands under "Go to, filtered" as "Shows · Netflix", and
↵ sets the filter on that tab's own module-scope store and navigates — which is what lets a filter
be set on a page before that page has ever been mounted. A page holding the category but none of the
value gets no hit at all, that hit being one that empties the page it was pressed on.
`attributeAction` adds to whatever the target already holds rather than replacing it, the same thing
a second chip pressed in This page means.

**The third reading is a row of its own, and it leads.** "Across the library" opens the value as a
`DrilldownDialog` over the gallery's own collapsed works, across every library recording it — which
is one library where only one records it, an author or a platform, and why it is worded for the
library rather than for the media. It stands above the narrowings because a phone's box shows about
five rows and a reading put third falls under the fold on any query matching several values; the
cost is that ↵ and a soft keyboard's Go open the layer rather than filtering the page. A hit answers
one press and one press only — a chord would be a reading a touch screen has no key for, and the
lit row would advertise it. It stands beside the franchise view, which is the same reading of the
one value the shelf cannot hold — the franchise column being mostly works naming themselves, so
`buildAttributeIndex` skips it and `franchiseAttribute` derives the narrowings from the ranked
index instead — and which of the two leads is how well each answered: `rankHits` states its first
hit's rank, and a series named exactly stands above a genre found inside a word. The franchise
takes a tie, its view saying more about a value than a shelf of works does. Ordered rather than
merged into one ranked list, because the two open different layers and a franchise row carries a
span of years a shelf row has nothing to put in, so one header would name two destinations. Every
attribute reaches all three readings, a value the box can shelve being one a page can be held to.

Matching (`common/searchData.ts`) folds text a character at a time — lowercased, accent dropped,
punctuation a space — so the folded string is the raw string's length and a match found in one is
underlined at the same index in the other. A go-to hit's title carries the tab's name before the
value, so its matched run is moved along by that prefix or the underline lands on the wrong word.
Rank is exact name, then a word start of the name, then of the second-rank text (an author, a
director, a developer and platform, a network and season subtitles), then any substring of either,
then every word of the query found somewhere; ties fall to size and then name. The entries come back
as given, so the raw franchise string — the key every index is held on — travels through unfolded.
The whole index is built once per library from the union the library provider hands every tab
(`useLibrary().items`) and the four libraries behind it, so guest mode is applied before anything is
indexed and a hidden item is absent from the index as it is from the union.

A franchise hit opens `app/FranchiseView.tsx`: the gallery's franchise drill-down with a header
saying what the franchise is before listing it — its media counted, four facts, and the franchise
strip with no subject, every mark `plain`, since the view is about the whole series and not one
card's place in it. Its works are the gallery's collapse over the franchise's rows alone rather than
its shelves, which drop a franchise of one work. A work hit mounts the item's own card with
`openOnMount`, in a host the reader never sees and fixed at a pixel rather than `display: none` so
the thumbnail loads and samples the colour the dialog is themed from, and unmounts it on
`onDetailClosed`; `OmniCardMediaImage` dispatches by medium, so a hit reached through search shows
exactly what the same artwork shows anywhere. Before anything is typed, the box offers the
franchises met most recently — the series the reader is in the middle of.

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
hover-card thunk — and the context; `app/franchiseUnionData.ts` builds it, mapping each
`OmniItem` through its own domain's `gameEntry`, `seasonEntry`, `movieEntry` or `bookEntry`, so the
union and a tab's own index cannot draw one item two ways. A tracked domain may not import another
and `common/` may import none, so the build sits in `app/`, beside its provider
(`app/franchiseUnion.tsx`), which is mounted by `Google.tsx` above the outlet. It builds the union from
the items the library provider already holds (§3) rather than flattening the four libraries a second
time, guest mode having been applied to them once above it. Until all four land those items are
`undefined`, so the union is too and a card falls back to the strip its own index draws. The union groups on the
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
app already speaks that field's colour elsewhere — platform, franchise, genre, certificate, status, and
nothing else, a swatch with no vocabulary behind it teaching a legend no chart honours.

Both shells take plain `{ label, value, … }` arrays, so `common/` never learns what a PEGI certificate
is: the four domain `CardMediaImage.tsx` files build them and choose the omissions, a tile reading
zero because the sheet recorded nothing saying something false. `LedgerList` is exported for a
surface that seats those rows itself, and `DetailCard`, the uniform tile, for a domain with too few
facts for the split to buy anything.

Below `sm` the dialog is a sheet: the card stands at a minimum `100svh` and carries a `SheetBar` —
a grabber, the item's own name and a ✕, 48px tall (`SHEET_BAR_HEIGHT`) — as its first child, sticky
above the artwork on the artwork's own ground rather than the paper's, so the name and the way out
survive the scroll a full-bleed picture invites. The name is stated at every scroll position rather
than faded in, since a bar that fills in as you scroll reads as something loading rather than as
chrome that was there from the start.

**`common/SheetBar.tsx` is that bar, and every layer in the app opens with it**: this one, the
expanded list, the drill-down, the hover sheet and the box, whose bar carries the Find · This page
segment as its title, since what the box _is_ changes with that segment and a word above it saying
the same thing is two headers. The reader's question at
each is the same — what is this, and how do I leave — so a chrome per layer taught an answer per
layer. The ✕ is that answer at every width: an arrows-in glyph in a dialog's header reads as "back
to the card this came out of", which is a second verb for the one thing a layer does. It lives beside the sheet recipes rather than
in `Card.tsx`, since `Card` mounts every hover card through `HoverCardTooltip` and a bar exported
from there would close that import into a cycle. `sheetBarRow` (`common/fullscreenSheet.ts`) is the
48px row itself and the ground is the caller's: the paper's under a layer over the page, the
artwork's under an expanded card, and the sheet's own — not pinned at all — under a bottom sheet,
which stands under no notch. The expanded card's is the one drawn below `sm` alone: from `sm` up
that dialog is a window over the page, whose picture, backdrop and Escape are the ways out.
`pinnedSheetBar` is the row pinned at the top with the notch paid for above the bar's own content,
and `paperSheetBar` is that row on the paper with a rule under it — the ground every layer but the
expanded card wears; the dialog's `Paper` and `Card` both
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

The border on every card is a vocabulary the page speaks nowhere else, the charts above the wall
being grouped by something else, so the wall draws it as a key under its header: the field's name,
then a swatch and a word per value present. Naming the field alone tells a reader the colours mean
something without telling them what any of them means. Both halves of an entry come off the same
item, so the swatch and the word cannot disagree; a value whose colour lookup answers nothing is
left out, the card wearing no border for it either. It is drawn under every sort the wall offers,
none of which is the border's own field — the wall orders by date, by franchise or by one of a
domain's own figures, and the marker names its runs by that order — and ordered numeric-aware, one
of the four vocabularies being a
certificate ramp a string sort runs "12, 15, 18, 3, 7". The header's own count is `wallPopulation`
(`common/finishedData.ts`): what the wall is over, stated only where the wall is _shorter_ than the
page, which it is wherever the sheet holds a row with no artwork — the card is the picture, so an
item without one is not on the wall at all, and the rail's chip says the rest.

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
avatar slot, which centres against the whole header. **A header states a figure only where it
differs from the page's population**, which the section rail's own chip states once
(`common/population.ts`, below): the Shows timeline says "792 seasons" because a bar per season is
a population nothing else on the tab counts, and says nothing under Shows, where a bar per show is
the page's own; the four chart shells state nothing at all. The Books timeline states one under
both its readings for the same test — a bar per book differs from the page by that chart's own
future-start floor, and a bar per series is a figure nothing else on the tab counts. That second
one counts a book the sheet named no series for as a series of itself, which is what the chart
draws it as, where the Series filter and the Most Read band both drop a blank: 88 against their
64, one library and two readings of the word. It arrives worded, a `common/` shell
not knowing it counts games. Below `sm` the controls take their own row, negative margins and all: a
title and four controls otherwise divide 375px and the title wraps to a word a line. That row is
`ActionRow`, a horizontal scroller rather than a wrap — the rail's own `ScrollFade` and
hidden-scrollbar recipe over a `flexShrink: 0` child, so the sunburst's three pickers or Movies' and
Books' axis and split pickers beside the four view segments run past the card's edge instead of
breaking a picker's label across two lines. Mounted at every width rather than gated on `usePhone`,
since the choice a fixed set of `sx` breakpoints already makes is exactly this: above `sm` the row
is unconstrained and never scrolls, so the fades stay off and the wrapper changes nothing. A slot
holding no more than one icon button stays on the title row, the caller saying so through
`compactActions` — a row of its own for an expand toggle is a blank line with an icon at the end.

`common/population.ts` is the three sentences the app counts in: `stated(n, noun)` — "309 shows",
the noun each medium's module carries — `cut(shown, total)` — "10 of 1,539", or the whole figure
where nothing is cut — and `all(total)` — "All 1,539", the worded cut a control wears. One module
because the alternative is these three written out at twenty-odd call sites, each one `format` away
from a library of 1,539 reading as "1539" beside a chart that reads "1,539". `isNarrowedEmpty(count,
filtersActive, scoped)` is the fourth: true only where a setting the reader made, and not an empty
library, is why a page holds nothing, which is what tells a chart's own "nothing to plot" line apart
from `common/NothingMatches.tsx` and its way back. Both settings count — the year scope narrows a
page exactly as a filter does, and a page scoped to a year its library has nothing in would
otherwise draw a blank canvas with nothing anywhere saying why — and each is asked separately,
because the message offers the setting's own undo. It is asked of the page once, above the outlet,
and reaches the shells through `common/nothingMatchesContext.ts` (§6).

`common/Stats.tsx` exports what the domain `Stats.tsx` files assemble into a grid: `StatCard` and
`StatSummary`; `YearVitalsPair`, all-time and in-year cards differing only in figures; `StatList`;
`VitalsCard`, one card however many bands a domain stacks; `TotalsBand`, a proportional bar and
wrapping legend over `common/statsData`'s `groupTotals`. Domains hold the arithmetic, shells the
layout. `StatList` takes the same `empty` prop the chart shells do, drawn by `StatsListGrid` in
place of the card grid where the reader's own filters have left `content` empty; a domain's
"Recently X" and name-sorted "Most X" lists pass it down from the page's own `Graphs`, since it is
the whole page's filters and not a card's own further narrowing that the message answers for.

`YearVitalsPair` is two plain cards and no control. The year scope is one page-wide reading, set in
the rail (§ Page architecture), so the pair states the two readings side by side — "All time" or
"Up to 2019", and "In 2026" — and the one the page is filtered to wears `StatCard`'s `scoped` rule:
the tab's primary as an inset three-pixel line along the card's top edge, inset so a lit card
cannot stand a pixel taller than the one stretched beside it. Both titles come from `scopeLabel`
(`common/scope.ts`), the words the rail's own picker reads, so a control and the card it lights
cannot word one scope two ways. Marked on the card as well as on the control because the pair is
the one place the two readings stand together, and the lit figure is the one a reader carries down
to the charts and the wall.

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
  inline and again in the dialog, and is handed the expand control for its header. That control is
  **the worded cut** where the card is showing fewer than it holds — `cutLabel`, `all(total)` from
  `common/population.ts`, drawn as "All 1,539 ›" — and the ⤢ where nothing is cut: the wall, a
  gallery whose shelves all fit, a strip that scrolls sideways and already holds the whole list
  (`wrap={false}`). The figure and the way to the rest of it are then one object, where an icon
  beside a header reading "10 of 1,539" states the cut twice and says nothing about how much is
  behind it. The dialog carries no control of its own, its bar's ✕ being the way out. `useDialogMount`
  pairs `open` with a `mounted` flag lagging it until `onExited`, so the body survives the exit
  transition and is never built behind a closed dialog. `CardMediaImage` gates the whole `Dialog`,
  not just the body: an uncapped wall mounts one per item, and a closed `Dialog` still renders
  itself, its `Modal` and their hooks before returning null. The dialog takes an `onClose`, so
  Escape and a backdrop press close it like any other dialog, and the bar's ✕ stands at every
  width — which also answers a caller whose content shrinks while it is open, a select switching to
  a category with fewer groups leaving nothing in the header to press.
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
tracking, where a date and a "days in" — "days", on a season the sheet has closed — at the caption's
own size are a line and a half. Shows'
poster lists pack four to a row at `md` and six from `lg` (`pictureWidth` takes an optional fourth
span) for the same reason: six at 900px are 133px each. The Omnibus's closing line is a name, which is why `omniLabels` states
the date first.

`common/Card.tsx` provides `CardMediaImage` and the `TypedCardMediaImage<T>` contract each domain
implements (`game/`, `show/`, `movie/`, `book/`, `app/` over the union): the adapter letting
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
lands late otherwise grows from an anchor placed for something smaller, off the screen top. The popper is interactive, so the pointer can cross the mat and reach the
card, whose picture opens the item's expanded card: a hovered mark is a door to the same place a
tapped one is, which is the one thing a mouse would otherwise be offered less of than a finger. `leaveDelay` is what makes the
crossing possible — a tooltip closing on the anchor's own leave event is gone before the pointer
arrives. A caller whose marks stand a row apart asks for `transparent` instead and trades the
crossing away: the card ignores the pointer, so a reader running down the chart reaches the marks
beneath it rather than the card about the row they have left, and the mark takes the press in the
card's place (§ Timeline). That press puts the card away as well as opening the layer, and it is
latched rather than timed: MUI arms its enter timer when the pointer arrives at a mark and clears
it only when the pointer leaves, never on a click, and the timer holds the callbacks of the render
that armed it — so a press inside `enterDelay` is followed by a stale `onOpen`, and a guard read
there is reading the state as it stood before the press. The latch is read where `open` is
computed, which no timer holds a copy of. The mark's own `mouseover` is what lets it go, that being
the one event saying the pointer has genuinely arrived: a layer opened from a mark swallows the
pointer, so no leave arrives while it stands, and a latch waiting for one opens that mark's card
once and never again. The hover the press refused goes with it — MUI declines to call `onClose`
while `open` is false, so the mark is still holding it, and letting the latch go alone would show
that card the instant the pointer touched the mark. `enterNextDelay` is stated alongside `enterDelay` for that reader —
MUI holds a hysteresis flag shared by every tooltip in the app and reads the second one for 800ms
after any of them closes, and its own default is no delay at all — and the open flag is held in the popper rather than left to MUI, because that dialog is a
child of the tooltip's own content: its backdrop takes the pointer off the popper, and a popper
closing there would unmount the card in the same frame it opened. `HoverCardHold`
(`common/hoverCardHold.ts`) is what `CardMediaImage` says so through, a pair of no-ops for every
card rendered anywhere else. A finger
gets a bottom sheet instead, opened by a tap rather than MUI's own 700ms press, wearing the same
`SheetBar` as every other layer where the mark knows its item's name and the grabber alone where it
does not, and mounted only
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
Books the book in hand most recently begun, Movies the film watched most recently. Shows leads with
the season holding the last episode watched, read off the date the converter puts on a season it can
date (§3) — its end, or the sheet's own cell, and neither for a season still running that the cell
has not reached: a finale is a watch like any other, and a show is `Ended` by the time the page next
draws it,
so an election pinned to what is still in flight puts the season finished yesterday out of reach of
the one surface meant to name it. Every season in the library is a candidate whatever its show's
status. Day precision is all the sheet records, so two watched on one day are separated by the
finished one leading — finishing something being the more notable of the two — and where the sheet
dates no season at all the hero has no honest pick and the page shows the strip alone.

Under it, "Currently Watching" is the latest season of every show the Status cell still marks, in
that same order. A season that has ended stays: the cell marks a show whose next season is to come,
and dropping it takes a show the reader is midway through a series of off the one strip that answers
what is in flight. A season the sheet dates neither way sits after the dated ones, in the order the
sheet lists their shows — a start date is not a tie-break, a season begun later not being one watched
later. The hero and the strip answer different questions, so each stands on its own test and a page
can hold either without the other.

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
`scroll-margin-top`, without which the browser lands a section's top edge under the sticky rail —
`SCROLL_MARGIN`, 72px, from `sm` up.

**Below `sm` the rail is the bottom row of the bottom bar**, and nothing is pinned at the top of
the page at all. The bar fixed to the bottom edge (`BottomTabs.tsx`) is two rows: the page's own
rail along the edge the thumb rests on, at every scroll position, and the five tabs above it. The
rail is what a page is read through — sections, the measure, the filters — and the tabs are what a
reader changes pages with, and both are used often enough that a bar showing one at a time makes
every tab change two taps. The tab row folds on a scroll down and returns on a scroll up
(`useTabsUp`), so most of a page is read under a 40px bar (`PHONE_RAIL_HEIGHT`, `chrome.ts`) and a
tab is one tap away the moment the reader turns back; near the top of the page it stays up whichever
way the last movement went. Direction rather than the app bar's crossing, because the tabs are
wanted between pages and a scroll back up is the gesture that says the reader is done with this one.
The page clears the bar at its full height throughout (`BOTTOM_TABS_CLEARANCE`), so nothing under
the fold moves as the row folds. A press on the tab already open scrolls to the top,
`BottomNavigation` answering a press on its selected action.

`SectionRail` renders that row through a portal into a slot the bar publishes on a module store
(`common/phoneBar.ts`), rather than the bar building it: the two are on opposite sides of the tree —
the bar above the outlet, the rail inside a tab's own lazy `Graphs` — and only the page knows what
its sections are. The slot is a `display: contents` box, so what the page portals in are the bar
row's own flex children beside the tab chip; `RailChip` is its own module (`common/RailChip.tsx`)
so that the bar takes the chip and not the scrolling row, its fades and its edge observer with it. `PHONE_SCROLL_MARGIN` is what an anchored section clears there:
8px, plus `env(safe-area-inset-top)` in the CSS form, since nothing is above it but the device's own
inset. The wall's sticky `BucketHeading` takes that same CSS form, the notch included, being drawn
on a phone alone;
`MARKER_TOP` keeps the full margin, the pill and the jump rail it positions mounting from `sm` up.

The same module holds the two arrangements a section is built from, page structure rather than
visualisation: `StatBand`, the stretched row of stat cards, taking children, and `ChartPair`, the
md-split standing a sunburst beside a barchart, taking a `left` and a `right` — one spacing rule
rather than eight sites across two domains. Each domain's `sections.ts` owns the id map and builds
the chip list, whose ids have two holders — `Stats` the bands above the charts, `Graphs` everything
below — and which comes from the same test `Stats` makes about whether there is anything to lead
with, so a chip never points at an anchor that is not on the page.

**`app/PageRail.tsx` is the rail with those readings already in it.** The four controls at its tail
are one arrangement over one page's state, and each tab was building it out of its own filter state
— five copies of a rule about which control stands where, kept in step by hand, and the fifth of
them over a state that comes from no medium at all. It reads the current tab, that tab's state and
its page module for itself, so a `Graphs` says only which sections its page has and how many rows
its charts are drawing. The row count is the one thing passed in: re-derived here it would run the
page's own predicate over the library a second time every render, and a figure arrived at twice can
disagree with what is on screen. It lives in `app/` because it asks the composing layer which page
it is over, and it is reached only from a tab's own lazy `Graphs` — so, like the search surface, it
may read `tabs.ts` without the temporal-dead-zone problem an eager import would create.

The rail carries the page's whole-page readings in named slots at its right end: `scope`, the
years every figure on the tab is scoped to; `measure`, the unit they are counted in; and
`population`, the chip stating what the filters leave (`FilterChip`, below). Each belongs on the
one control surface reachable from anywhere — they narrow the vitals, the timeline, the charts and
the library alike, and a control standing beside the cards it most visibly changes cannot be
reached from the wall, which is where a reader notices the page is a subset. Named slots rather
than a node per end, because where each of the three stands is a rule this shell states once and
five `Graphs` modules would otherwise each carry a copy of. All of them sit outside the scrolling
chip row, which would carry them away. The chip row is sized at a basis of zero, so it takes what
the controls leave and never a share of the shortfall, and overflows into its own scroll: a picker
at three quarters of its width is a value with no room for its own caret, where a chip row is a
list that scrolls by design. Past that the controls' own row scrolls too, a rail overflowing its
container putting the whole document on a sideways drag. `SegmentedControl` states the measures as
words, a Σ on a floating button being a legend nothing on the page teaches.

**The chips own the row at the two widths where everything will not fit.** From `md` the tail is
all three. Below `md` the scope leaves it — at 768 five tab chips, seven section chips, a picker,
three segments and the population want about 990px of 720 — for the labelled row the box's own This
page mode draws (§ Search), through a `display` rule rather than the width read as a value, since
that row is drawn at every width and one of the two copies is hidden either way. Below `sm` the
measure and the population go with it and `pageChip` stands alone in their place: at 390 the three
want 440px of 358. `PageChip` (`common/PageHandles.tsx`) is the picker's own face reading the
measure — the setting changed most often — with the filter badge on it, and it opens the box on
all three; the population reads in the box's own footer. Four
section chips of Shows' seven then stand in the 258px left, with the fifth cut at the fade, where
the chips are a list that says by scrolling that there is more. That split is read as a value
(`usePhone`) and not as a `display` rule: the controls it drops are live in the box at this width,
and hiding them here would leave a second copy of each dispatching to the page state from a control
nobody can see.

`ScopeControl` (`common/SelectionComponents.tsx`) is the scope's picker, reading "All time",
"In 2026" or "Up to 2019" through `scopeLabel`. Its menu holds the two scopes asked for by name —
everything, and the year in progress — and sends the rest to a popover carrying an Up to · In
segment and a year picker down to the domain's own `earliestYear`: every year the sheets cover is
thirty menu items, where those two are almost every use of the control, and the reading and the
year are one choice a menu has no room to hold. The picker lights whenever the page is not reading
everything, which is also why the scope is neither counted by the filter badge nor cleared by
Clear (§7): a control that says on its own face that it is on would otherwise be stated twice and
undone in two places.

The tab chips that lead the pinned rail from `sm` up are each their tab's own icon in its own colour — the
primary on the light paper, the bar's `ink` on the dark, through `tabInk` (`tabs.ts`), since the
primary on the dark paper is the value that tab's tint was mixed from. Icons rather than words at
every width they are drawn at: five names and a divider take half a tablet's rail where five glyphs
take 172px, and the app bar's own strip carries the same icons beside its words, which is where a
reader learns them. All five (`allTabs` and `useTabChips`, `tabs.ts`), and only once the app bar has
scrolled away: what makes the row quicker than the app bar's own strip is that a hand reaches the
third chip without reading the row, which a set sliding along by a chip wherever the current tab is
left out cannot offer, and under the bar the five icons would restate the strip of five names a
line above. The chip for the tab in hand is lit
— filled in that tab's own colour rather than the theme's primary, which on that tab's own page is
the same value and so would say least exactly where it is drawn — and answers a press by scrolling
to the top and navigating nowhere, routing to the path already open pushing a second history entry
for it, as the bottom bar's own selected action does. They stand beside the scrolling row rather than
in it: at 768 a tab's seven sections overflow the row, and a rail that follows its lit chip would
otherwise carry the tabs off the left as the page is read. `useOtherTabs` is those five less the one in hand, for the search box's "Go to" line, which
offers places to go rather than positions to learn. Every `ChipRail` — this one, the timeline's years — keeps its lit chip
in view: when the active id changes the row scrolls so that chip and a margin of its neighbours are
inside it (`railScrollTarget`, `common/chipRailData.ts`), instantly under `prefers-reduced-motion`.
A rail is a reading of where in the page the reader is, and on a phone the row holds four of a tab's
seven sections, so most of those positions are off-screen ones. The offset is computed rather than
asked for through `scrollIntoView`, which scrolls every scrollable ancestor — the document included,
which would move the page the highlight is a reading of — and the effect is keyed on the lit chip
alone, so the reader's own flick along the row is never taken back. `RailChip`'s icon-only form is a
circle — the label's padding and MUI's
own offsets for a mark beside a word are dropped and the width follows the height through
`aspect-ratio`, so the glyph is centred at whatever height the pointer gives a chip — and it is
named by its `aria-label` and nothing else: a word appearing only under a pointer teaches nothing to
the finger a rail is mostly read with, where the app bar's own strip pairs each glyph with its word.
No chip anywhere carries a hover label, which is also what keeps MUI's `Tooltip` and the Popper
engine behind it out of every chunk a rail is drawn in — `tests/architecture.test.ts` pins that the
first paint never reaches it.

The chips are dropped entirely below `sm`, where the bar's own leading chip calls the five tabs
back into the row and a rail spending 300 of its 358px saying so again buys nothing; a rail's own
chips still fill the rest. Under a coarse pointer every chip in the
rail — a tab's, a section's — stands at the kit's coarse 32px rather than its own 24 (the theme's
small chip, behind `@media (pointer: coarse)` so a tablet with a mouse plugged in gets the desktop's
own height), which makes the rail 8 + 32 + 8 + 1 where a pointer gets 8 + 28 + 8 + 1; `SCROLL_MARGIN`
clears the taller of the two by 23px.

A tracked tab's library closes its page at every width — the wall runs to hundreds of cards, so it
is the section a reader scrolls into and stays in rather than one to glance past on the way to
something else. The Omnibus reorders instead: its gallery is the other section built to be scrolled
rather than read at a glance, so on a phone it moves after Franchises, the two longest sections on
the page trading places so only one of them closes it — `omnibusSections` (`omnibus/sections.ts`)
reorders the chip through `movedAfter` (`common/sections.ts`) on the same `usePhone` its `Graphs`
module reads once to reorder the DOM. Both halves have to agree: `useActiveSection` lights the first
of the rail's own list still inside the reading band, so a page painted in one order and a rail
listing another lights the wrong chip from the first scroll, and a chart folded shut under
`FoldedChart` mounting nothing at all rules out a `flex-order` swap that would still fetch and lay
out the chart it hides.

### Phone and tablet

Most of what a narrow screen or a coarse pointer changes is stated inline against the subsystem it
touches — the Now band, the franchise strip, the hero, a folded chart, the scroll marker. What
follows is the scaffolding underneath: the primitives every one of those reads, and the chrome
around the page itself.

**Two questions, answered as values.** `usePhone` and `useStackedCharts` (`common/breakpoints.ts`)
are the only breakpoints the app reads as booleans rather than writes as `sx` keys, because their
callers need the answer before they can decide what to render at all — a folded chart mounts nothing
until opened, a dialog and a fullscreen sheet are different trees, and the tracked tabs put their
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

**Chrome.** `NavBar` keeps three targets at every width — the authorise key while there is something
to authorise, search, and the `⋮` — and everything else the session can do is in that menu, drawn at
every width and pointer (§5). One list on one surface is what keeps the bar and the menu from
disagreeing about which actions exist; drawn as buttons as well below some width, an iPad held
sideways would list Sheet and Authorise twice, since it clears the width test and still points with a
finger. At 768px the wordmark, five tabs and two worded buttons want about 800px of a 720px content
width, which is why only the key wears its word, and only from `md` with a fine pointer. The menu is
also guest mode's only handle, carrying a "Guest mode"/"Leave guest mode" item in both directions —
the long press that reaches it elsewhere is a mouse gesture alone (§7, Guest mode), so without the
item a finger has no way in, and a mouse no way out but a reload.

Each tab in the strip carries its own icon beside its word (`iconPosition="start"`, so the strip
keeps one row's height). The word is what the strip is for, and the glyph beside it is what teaches
the mark the pinned section rail names every tab by from `sm` up, and the bottom navigation names it by on
a phone — one icon per tab, from `Tab.icon`, drawn in all three places.

Below `sm` the tab strip itself is replaced by `BottomTabs`, fixed to the screen's bottom edge and
reachable from any scroll position and a thumb, which no arrangement of the `position: static` app
bar achieves; it wears the tab's own `barColour` as the app bar does, so the top and bottom of a
phone name the same tab, and a tab change resets scroll (`window.scrollTo({ top: 0 })`) the way the
rail's own chips do. The tabs are its upper row (§ Page architecture): the lower is the page's
rail, in the tab's colour too so the bar reads as one thing; the chips it holds are the kit's, solved
against `background.default` — a lit chip is filled in the primary and would be invisible on a bar
that _is_ the primary — so `onBarSx` (`common/barTone.ts`) re-tones them onto the bar, the unlit in
the bar's ink and the lit filled with it and worded in the bar's own colour, and the chip row's end
fades resolve to the bar rather than to the page (`SectionRail`'s `phoneGround`). Every part of
that row takes those tones: those are descendant rules and outrank a child's own `sx`, and a chip
that carved itself out of them would be drawn in the colour the light bar is painted in. Safari
samples this bar for the bottom of its chrome, which is then the tab's colour at every scroll
position.

The top edge has no bar of its own to sample, so `BrowserTint.tsx` stands a strip there in the tab's
own colour while the page is against the app bar, and is not drawn at all once scrolled past it, on
the `useScrolledPastBar` boundary (`common/chrome.ts`).
With nothing fixed at the top to sample, Safari draws its own translucent status bar over the page,
which a stated ground can only imitate; the `theme-color` metas `Google.tsx` emits (§ Theming and
routing) stay, stating the page's own ground there for the browsers that still read one. Left at the
tab's colour throughout, a reader scrolled deep into a library sees a coloured band at the top of an
otherwise plain page, naming a bar long since scrolled out of reach. That boundary carries a dead
band of eight pixels either side (`scrolledPastBar`), so a reader coming to rest against the app
bar's own height does not have the strip, the bar and the metas flicker on every small movement of
the thumb. `common/chrome.ts` states what the app's own furniture costs the page:
`BOTTOM_TABS_HEIGHT` (56) and its `env(safe-area-inset-bottom)`-padded `BOTTOM_TABS_CLEARANCE`, which
the page container and the data snackbar both stop short of, and `safeAreaGutters`, MUI's own
`Container`/`Toolbar` gutters restated with the device's side insets added — a notched phone held
sideways puts a sensor housing or a rounded corner exactly where an unpadded 16px margin sits. None
of it does anything without `viewport-fit=cover` in `index.html`, which is what makes `env()`
anything but zero, and the manifest's `theme_color` is the Omnibus tab's own primary (`#7553ff`), the
colour a phone's status bar wears before any tab-specific theme has painted. `Google.tsx`'s
`MuiCssBaseline` override turns off the grey tap flash on `body`: it is drawn at a tap target's own
box, which on a chart is a whole row group behind a bar a few pixels wide, and every tap here already
answers with the card it opens. The same override paints the document — `html` and `body`, Safari reading
the body's — in the tab's bar colour while the page is against the app bar, at every width, and in the
page's ground once past it, on a `data-past-bar` attribute `BrowserTint.tsx` sets from the boundary
its strip already keys on; the page's own ground moves onto `#root`. Safari extends that background
past the page's ends and under its status bar, so a pull past the top shows the bar's colour where a
band of paper would otherwise open between the status bar and the app bar, and a page scrolled past
the bar keeps a status bar over its own ground rather than one tinted in a bar that is gone. A bar
reaching above the document's edge shows nothing there: Safari paints nothing past it.

**The mark.** `public/favicon.svg` is the phone's Now band as four blocks — a banner over a cover
beside a poster over a banner, each in its medium's fill, the two columns level as the band's own
are — run to the tile's edge, with the Omnibus bar's dark-scheme tint (`#302c56`) showing only in
the gutters. The tint rather than the primary because on `#7553ff` no medium fill clears 2:1,
where on the tint the dark-scheme halves clear 3.5:1 or better, and a mark whose four colours are
its meaning has to keep them at 16px. Every raster in `public/` is that file rendered —
`favicon.ico` at 16 and 32 for the root fetch, the `any` PNGs with their corners transparent, and
`apple-touch-icon.png` and `icon-maskable-512.png` full-bleed, since iOS and an Android launcher
each apply a mask of their own to an opaque square. `AppIcon` (`src/AppIcon.tsx`) is the same four
blocks in one ink beside the wordmark, inset rather than full-bleed since a tile in one ink is a
square, where the bar is already a tab's colour and a magenta block on the Games bar would vanish.

**Touch surfaces.** `common/touchTarget.ts` is the shared hit-box recipe behind the franchise strip's
beads and `TimelineBandBox`'s bands (above): a box sized for a coarse pointer alone, invisible and
stated as a height so it cannot reach over a dense neighbour. `FoldedChart` (`common/FoldedChart.tsx`)
is the general mechanism behind every folded chart above — five callers — a card that renders only
its header, a one-line summary and a shape-of-the-data preview until the reader asks for the chart
itself, past `usePhone` alone; from `sm` up it is the plain card it always was. What asks for it is
a ⌄ in the header, turned over to ⌃ once the chart is drawn, and the summary row answers the same
press: those words and that picture are what a reader is looking at when they decide they want the
chart. The ⌄ rides `SectionHeader`'s `titleAction` slot rather than its action row, since below `sm`
that row scrolls and a setting may go past the edge where the way to the chart may not — and
`FoldedChart` is that slot's only caller for the same reason. The header is built here rather than
handed in as a function of the fold's state, because every one of its four states — folded, drawn,
nothing to plot, nothing matching — heads the same card, and a caller building it is five copies of
one arrangement. It takes the header's parts instead: `icon`, `title` and `count`, `controls` for
its own live settings, drawn only with the chart they are about — a split or a set of rings is a
choice about a chart that is not mounted, and the line the fold states is drawn from the same pivot
whatever they say — and `action` for a control that stands either way, the crossings' cut being the
one. `blank` is the fourth state: what the caller states in place of a chart it cannot draw, which
is the barchart's empty pivot. The packed timeline alone never folds (above). `CONTAIN_SIDEWAYS_SCROLL` (`common/scrollbarSx.ts`) is the same fix
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

`game/types.ts` splits a company two ways: **fills** for chart geometry and **accents**, the brand
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

Eight vocabularies live in `utils/types.ts` because more than one tab speaks them: the genre ramp,
`statusToColour`, `franchiseToColour`, `decadeToColour`, the score bands (`scoreBandToColour`, which
Movies and Books both rate on), `certificateToColour` over the `Certificate` union three of the four
domains record a certificate into, `animeToColour` over the split Shows and Movies both record, and
`mediumFills` with `mediumToLabel`, `mediumToName` and
`mediumUnit` — the only colour a mixed-media surface carries meaning in, re-exported by
`app/types.ts`. Its hues are the home tabs' own, so `tabs.ts` constrains them; the closest pair
is 16.8 dE. The light Books half is `#ab9219`, the brightest gold clearing 3:1 on white, not the
tab's darker `#958112`, because lightness is what a deutan reader has left: at the Movies red's
lightness a Books gold collapses onto it under simulation, 1.3 dE at `#857200` against a working
floor of 8, and the genre bridge's segments and the crossings' lanes carry no label. One step
brighter the pair sits 10 dE apart under deutan and 19 under protan, hue unchanged.

The status table treats Playing, Watching and Reading as one state and Beat, Ended and Finished as
another, each word taking its state's fill exactly, so a chart over the union draws one colour per
state. Every tab writes the bare age, so the six values are one vocabulary; the boards differ only
in which of them they use, BBFC issuing a 15 where PEGI issues a 16 for one tier, and the colour keys
off the tier rather than the number. `isCertificate` lets a converter reject a bad cell while it
still knows the row — though what actually keeps a board's own five values in its column is the
sheet's dropdown, a converter only being able to report a cell already written. `certificateBand` names that tier rather
than colouring it, and is what the colour is looked up by. `animeToColour` is a pair
rather than a ramp: Shows and Movies both record the split and both group charts by it, so the rose
means anime on either tab. Only the anime half is shared — the word for it is the
`ANIME` constant, which is also what folds the two tabs' selects into one entry the box shelves —
while each tab keeps its own word for the rest, a series that is not anime being a show and a film a
film. That rest takes `NEUTRAL_FILL`, being an absence and not a second thing, which is also what
keeps it clear of the Cinema/Home pair the Movies filter surface now draws three rows below it: a
hue of its own there was a blue 3.7 dE from the sofa's, two colours a reader cannot tell apart
meaning different things on one screen. Books
adds three formats at chroma 0.14,
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
the games carrying a bare year, `game/cardData.ts` shares each year between the games naming it, in
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
- **An import expression**, which is why each domain keeps its `import("./Graphs")` in a
  module-scope `loadGraphs` that `lazy()` and the prefetch effect both call — the one piece of a
  tab's entry that `app/tabEntry.ts`'s factory cannot own for it.
- **An object literal with a computed key** — `{ [theme.breakpoints.down("sm")]: {...} }`, the shape
  a phone-only style rule takes wherever the value itself has to change and not only be hidden.
  Written inline it bails with `BuildHIR::lowerExpression … Expected Identifier, got CallExpression
key in ObjectExpression`; pulled out to a plain function taking the varying pieces as arguments —
  `sheetBarSx`, `dialogCardSx`, among others — the literal itself sits at module scope and the
  component stays compiled.

The baseline is **272 compiled, 0 bailed**, so any bailout is a regression; the `MethodCall` kind
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
- **Object lifetimes.** `TimelineData.tooltip` is a thunk because `packRows` copies every row and
  `placeLabels` copies those copies again: built as nodes, each row's card and its footer labels
  would be constructed up front and held for the life of the layout, and through them the domain
  records. `measureLabel`'s cache is keyed on the font and the string rather than on a row, so it
  retains nothing domain-side however many layouts pass through it.
- **Module-scope hoisting.** `Google.tsx` caches themes per tab and reads MUI's default palette once;
  `common/sunburstData.ts` and `common/finishedData.ts` each hoist an `Intl.Collator` rather than
  calling `localeCompare` across thousands of comparisons. The compiler's per-component cache is a
  fixed slot array, so it would not survive A → B → A navigation as the theme `Map` does.

### Filter state

Filter state carries a composed `filter` predicate as a _field_, rebuilt inside the reducer whenever
an input changes. Components call `data.filter(state.filter)` without knowing which criteria are
active, and adding a criterion means adding one predicate to the `filters()` builder.

`createFilterReducer(initialValues, filters)` in `common/filterReducer.ts` returns a domain's store
and its `useFilterReducer`, and owns what is the same everywhere: the action union, rebuilding
`filter` after each change, and three shared pieces — `yearPredicates` (an "up to" ceiling that
disappears once it reaches the current year, or an exact match), `selectedPredicates` (a
multi-select where an empty selection is no constraint, returned as a list so an inactive control
contributes nothing rather than an always-true predicate), and `activeCount`, bound to the initial
values the reducer already holds. Each domain supplies only its own initial values and how to turn
that state into a predicate.

**A tab's state lives in a store, not in the tab.** The surfaces that read it are not all inside the
page — the rail stands beside the charts rather than within them, and the box that filters a page is
mounted above the router — and a filter can be set on a tab before that tab has ever been mounted, so a state lifted to their nearest common ancestor would be
lifted to the shell and re-render every chart in the app on a change reaching two components. Each
`filterUtils.ts` therefore holds one `common/store.ts` `createStore` at module scope, which that
helper is written to allow: it reads no browser global while it loads, so
`tests/architecture.test.ts`'s module-scope rule is satisfied by construction. `src/app/pageState.ts`
keys the five by **tab id** — the composing tab is a page with filters, a measure and a scope like
any other and is no `Medium` at all — and `usePageState(tabId)` is what a surface above the tabs
reads one through, `PageStore` erasing the domain's own fields so a record can hold all five.
`useFilterReducer` is the same store seen from inside the tab. Two things follow: filters, the
measure and the scope survive a tab switch for the session, where a reducer unmounting with its page
would drop them; and a surface narrowing a tab it is not on dispatches on that tab's store and then
navigates, rather than parking a pending filter somewhere for the page to find — which is exactly
what an attribute hit does in the box (§6). `pageOf` beside `usePageState` answers the rest of what
such a surface needs of a tab it is not standing inside: its schema, its measures, the noun its
population is counted in, its rows and the floor its year picker offers. A surface standing over
_the current_ tab asks `usePage()` (`app/page.ts`) for all four at once — the tab, that page, its
state and its dispatch — rather than repeating the tab-then-library-then-state-then-module lookup
the rail, the box and the shell's empty-state provider each need: three copies of one order are
three that can pair a state with another tab's module. It is the one file in `app/` outside the
provider that names `tabs.ts`, which is safe because nothing the registry reaches imports it.

The measure action _sets_ rather than advances, the control being a segment per measure: a press
names its own state, so setting the measure already held answers the same object and costs no render.
It is also the one action that does not rebuild `filter`, since no `filters()` reads the measure and
consumers re-filter on that predicate's identity. `scope` names the whole year scope it wants for the
same reason, a control with a state per reading having a lit segment to press twice — and both
halves at once, since a reading and the year it is read against are one choice: sent as two actions,
moving from "Up to 2019" to "In 2026" passes through "In 2019" and every consumer on the page
re-filters against a scope nobody asked for.

`countActiveFilters` counts fields, not predicates — three genres picked in one select are one choice,
undone in one place — comparing arrays element-wise and leaving `measure`, `filter`, `yearTo` and
`yearType` uncounted. `resetFilters` restores those same filter fields alone: the measure is the unit
every figure on the tab is counted in and the scope is a control beside it, so Clear leaves a reader
counting hours in one year exactly where they were.

**A tab describes its filters as data.** `<domain>/filters.ts` exports a `FilterSchema`
(`common/filterSchema.ts`): a toggle is a state field, a label and the predicate the page keeps
_while that toggle is off_; a category is a state field, a label, the accessor its values come from,
optionally its own option list and its colour vocabulary, and whether that vocabulary is long enough
to be searched rather than scanned. `schemaPredicates(schema, state)` composes the whole of it — each
toggle that is off, each category holding a selection, through `selectedPredicates` — and
`createFilterReducer` spreads the result beside the one rule a per-field schema cannot state, the
year scope, which belongs to no field. A key is typed
against the field it names, a boolean for a toggle and a list for a category, because a key naming
the wrong field is a filter that draws and silently never applies. `options` falls to
`common/filterOptions`' `categoryOptions`, and a category states its own only where the plain set is
wrong — the franchise column repeating a standalone item's own name, a blank nobody can name, which
is `franchiseCategory`, the one category all five tabs offer on identical terms.

**The schema is also the state.** The reducer seeds a toggle to `true` and a category to `[]` from
the schema itself, that being what "unfiltered" means for each — `hides` applies while a toggle is
off, and an empty selection is no constraint — so a domain states only what its schema cannot,
which is exactly how `initial` is typed: `Omit<S, "filter" | ToggleKey<S> | CategoryKey<S>>`, the
measure it counts in, the scope it opens at and the year its records answer with. A filter added to
a schema therefore cannot arrive without a starting value, where a toggle missed in a hand-written
list starts `undefined`, reads as off and hides rows on first paint — and a state field the schema
does not cover fails to compile rather than starting the same way.

One description, two readers: `common/FilterControls`' `SchemaPageControls` draws the whole surface
— the rows, the toggle chips and the value chips — for every tab there is, and the index of what can
be found by attribute walks the same schemas, so a page cannot be narrowed one way and found
another. Neither reader draws a toggle **icon**: the surface is a row of chips already reading the
label, and a schema is data the shell reaches, so an icon named there would put four tabs' filter
glyphs in the first bundle a visitor downloads. `SchemaPageControls` takes the schema, the state,
the dispatch and the rows through the `PageSchema`/`PageState`/`PageDispatch` erasure rather than a
domain's own generics, since the surface holding it stands above all five tabs and holds a tab id
and not a domain. `yearPredicates` takes a `yearOf` accessor as a
required argument and never a default: written over a generic record a default type-checks against
every model there is, so a domain whose rows carry no start date would compile and scope on
`undefined`, keeping nothing. The Omnibus reads `item.year`, the year it closed; Shows passes a
whole `yearRule` instead, the shared one reading a show's _first_ season, which keeps the filter and
the seasons-in-year vitals card in agreement. The scope those predicates read is set from the rail's
own picker and lights it (§6); `UNCOUNTED_FIELDS` leaves `yearTo` and `yearType` out of
`countActiveFilters` and `resetFilters` carries both through, so the badge counts only what the
filter surface holds and Clear leaves a reader counting hours up to 2019 exactly where they were.
The two vitals cards mirror that state without setting it.

**A selection is held to the vocabulary its own control draws.** A category's options are computed
over the _visible_ library, so guest mode switched on under a chosen franchise would leave that
franchise selected in the store with no chip anywhere offering or clearing it, and every chart on
the page narrowed to nothing for a reason the reader cannot see. `LibraryProvider` sweeps each tab's
selects against exactly the rows that tab's own controls list from — which is what each page module
answers with — through `retainPageSelections` (`app/pageState.ts`, the one file there that names the
composing tab). The `retain` action answers the same state object where nothing is
dropped, so the sweep costs no render on the runs that change nothing; a category holding nothing is
skipped before its options are computed, since a pass over the whole library per category, for five
tabs, on every sheet landing, is what the common case of nothing selected would otherwise cost. A
slice still in flight is skipped too, rather than swept against an empty list.

### Guest mode

Long-pressing the wordmark (`utils/useLongPress.ts`, 300 ms, over the pure `longPressReducer`) sets
`guestMode`, which `Google.tsx` hands to `app/LibraryProvider`. `visibleLibrary` (`app/library.ts`)
applies each medium's own `guestFilter`, exported from its `filterUtils.ts` and named by its
`module.ts` — a game whose `theme` includes `"Adult"`, a show the sheet marks anime, a film carrying
the sheet's `anime` flag; nothing marks a book, so that rule keeps the whole library — and every tab,
index and union reads the slice that comes back. It is applied to the data once rather than to each
page's filters because the franchise index, the union and the search index are all built from the
library: a mode narrowing one page's charts would put a hidden item straight back on screen through
a card strip. It is presentation, not a security boundary: the data is loaded already.

The gesture is the pointer's alone — the hook answers with mouse handlers and nothing else, a long
press on touch colliding with the browser's own press-and-hold — so the app bar's overflow menu
carries the mode as an item instead, in both directions and at every width and pointer (§5): the
press is the way in for a mouse and the item the way in for a finger, and the item is the only way
back out for either. The wordmark carries the press rather than the whole bar: a bar holding a tab
strip and a menu button is three hundred pixels where a press landing on none of them changes what
the page shows.

### Theming and routing

`Google.tsx` builds an MUI theme per tab from its `primaryColour` / `secondaryColour`, with
`cssVariables: true`. Both colour schemes are written out, because `colorSchemes.light` replaces the
top-level `palette` rather than adding to it, so a value named on one side only leaves the other on
MUI's stock blue. `enableColorOnDark` stays off and each tab carries a `darkBar` (`tabs.ts`) — a 22%
`tint` of its primary over the dark paper plus `rule` and `ink` siblings — read through
`barColour(tab, scheme)`, the single answer for what the bar wears, so a surface painted to match it
cannot drift. Two `theme-color` metas are emitted, one per scheme, each carrying the tab's own bar
colour above `sm` and, below it, swapping to the scheme's own page ground once the page has scrolled
past the app bar — the same boundary and the same `useScrolledPastBar` (`common/chrome.ts`) the
top-edge tint strip (`BrowserTint.tsx`, § Phone and tablet) keys on. Safari reads neither meta and samples the strip, which past the bar is not drawn; a browser
that does read one — Android Chrome, and an installed app, whose manifest otherwise answers with the
Omnibus's own purple whatever tab is open — lands on the ground the page at that edge actually
paints.

**The dark scheme's `primary.main` is that `rule`, not the primary.** A primary is solved against
the white paper: on the dark one Games' carries 3.6:1 and Shows' 3.4, which is a full-strength
band's floor and under what a lit segment's 12px word, a picker's lit edge or a filled chip's ground
needs — where `rule` is the same hue solved lighter and clears 5:1 on that paper, held there by
`tabs.test.ts`. The bar keeps the tint through `AppBar.darkBg`, and a chart's single-group series
keeps the light literal either way: `Barchart` reads `theme.palette.primary.main`, which under
`cssVariables: true` is the light scheme's value on both papers, which is why a primary is held to
3:1 on both (`fillContract.test.ts`). Themes are cached in a `Map`
keyed by tab id:
building one walks both schemes, typography, shadows and the whole CSS-variable map, and a stable
identity stops the MUI tree re-evaluating `sx` on navigation. `Google.tsx` also mounts
`LibraryProvider` inside `GoogleAuthProvider` and above the bar — every tab reads its sheet from
there, and the bar answers for the library as a whole — and `FranchiseUnionProvider` around the
`<Outlet>` inside it, a card on any tab drawing its franchise across all four media.

Routing uses `HashRouter` because GitHub Pages cannot rewrite deep paths to `index.html`. The root
route and the unmatched-path fallback are positional — `App.tsx` renders `Tabs[0].component` for the
index and for `*`, and `tabForPath` falls back to `tabs[0]` so the bar and theme agree with it — so a
tab's place in the exported `Tabs` array decides
what a bare `/` opens. Omnibus leads for that reason.

## 8. Extension points

**Adding a data source.** Add a `Tab` to `src/tabs.ts` (sheet id, A1 range, route id, component,
colours) and then to the exported `Tabs` array, which generates the router and nav bar and decides the
root route's fallback (§7). Create `src/<domain>/` with `types.ts`, a `converter.ts` exporting its
`DataConfig`, an entry component built by `createTabEntry` (`app/tabEntry.tsx`) over its own
`loadGraphs`, and a lazy `Graphs.tsx`.
Implement `CardMediaImage` against `TypedCardMediaImage<T>` to get `Finished` and `StatList` for
free.

A fifth medium extends the `Medium` union in `utils/types.ts` with its fill, label, name and unit,
and is then **a `module.ts`, a `module.lazy.ts`, a line in `app/records.ts` and one in
`app/media.ts`** (§2). The eager half answers what the medium is — its `DataConfig`, its guest rule,
its arm of the union, its `FranchiseEntry` mapper and span, its page state, its filter schema, its
artwork and its title; the lazy half answers what draws it: its card, its hover card, and the
election and Now panel the composing tab's band leads with — those four and nothing else, its
filter glyphs going beside its own `Graphs`. `app/records.ts` names the record its sheet
converts to and the one it contributes to the union, which is what pairs the module with its own
library.
Nothing else changes: `toOmniItems`, `visibleLibrary`, the crossings, the gallery, the search index
and the card dispatcher all read the registry, so a medium that answers everything on
`MediumModule` is on every surface the day it is added, and one that answers nothing does not
compile. A module never imports `tabs.ts`; it carries `tabId`. What is still by hand is the fetch:
a hook cannot be called in a loop, so `LibraryProvider` writes its four `useSheet` calls out and
names each medium once more in `raw`, `loaded` and `error`. `Library` itself is keyed by medium
over `app/records.ts`'s `LibraryRecord`, so the type and every walk over it —
`visibleLibrary`, `completeLibrary`, `toOmniItems` — take the fifth medium from the `Medium` union
without an edit. Four lines in one file, all of which fail to compile if any is missed.

The entry mapper is the piece the domain's own card strip calls too (through `CardMediaImage.tsx`),
so a tab's index and the cross-media union cannot draw one item two ways.

**Composing existing data sources, without a sheet of its own.** `omnibus/` is the reference: its
`Tab` carries no `spreadsheetId`/`range` (both optional for this case, with `SheetTab` restating them
as required for anything that fetches), and its entry component reads `useLibrary()` exactly as a
home tab reads its own medium's slice — it composes nothing itself. The cross-domain work — the
union, the search index, the franchise view — lives in `app/`, the one folder besides a medium's own
`module.ts` allowed to reach into more than one domain; a new tab built the same way stays outside
`common/`/`utils/` and reads what `app/` already composed rather than composing it a second time.

**Adding a visualisation.** Domain-agnostic, it belongs in `common/`, taking data plus callbacks with
a thin adapter per domain; domain knowledge belongs in the domain folder. The existing shells set the
level of inversion — `Sunburst` takes four callbacks, `Barchart` a data function and a scalar
`postAggregate` — and it stays at the level of _values and meaning_.

**Adding a filter.** Add a toggle or a category to the domain's `filters.ts` and the field it names
to its `FilterState` (extending `BaseFilterState`). No glyph: the surface drawing these is a row of
chips already reading the label, and a schema is reachable from the shell, so an icon named there
would put four tabs' filter glyphs in the first bundle a visitor downloads. **A two-valued split is
a category and not a toggle**, however few values it has: a split has three readings — everything,
one side, the other — where a toggle holds two of them and which two follows from how its predicate
happens to be written, so Movies' old `home` switch could show the outings alone and never the
nights in. As a category the same field states all three with the multi-select semantics every other
category already has, wears the vocabulary's own colour on its chips, and is found and placed by the
box like any other value. A toggle is then what it says it is: a page's own noise, an unscored film
or a medium switched off, which nobody asks to see alone. A category built by a shared helper —
`franchiseCategory`, `certificateCategory`, `animeCategory` — takes its key as a
`CategoryKey<S> & "the key"`: the literal so the helper still fixes it, two tabs keying one
vocabulary apart being two entries where the box's fold wants one, and `CategoryKey<S>` so the tab
is held to declaring the field. Stated inside the helper instead, `S` reaches `FilterCategory` only
under `keyof` a mapped type, which TypeScript measures as independent — so the check a bare literal
gets is not made at all, and a state missing the field compiles into a filter that draws and never
applies. Nothing in
`common/filterReducer.ts`, `common/FilterControls.tsx` or any chart changes, and no starting value
is written anywhere — every surface that offers filters draws whatever the schema holds, and the
reducer seeds the new field from it. A rule that is not per-field, like Shows' seasonal year cutoff,
is that tab's own `yearRule`, passed to `createFilterReducer` in `filterUtils.ts`.

## 9. Repository layout beyond `src/`

- **`extension/`** — a standalone Chrome MV3 extension (plain JS, loaded unpacked) adding "Upload
  Show/Movie Image" context-menu items on images and handing the URL to a macOS Shortcut via a
  `shortcuts://` URL. This is how banner artwork gets into Google Cloud Storage; it is outside the
  Vite build and shares no code with the app.
- **`.idx/`, `.vscode/`** — Google Project IDX and VS Code editor configuration.
- **`analyze.html` / `analyze.json`** — committed output of `npm run analyze`, indexing a
  `src/holiday/` domain the tree does not contain and mentioning neither `omnibus/`, `movie/` nor
  `book/`: neither compares against a shape the build produces. The script prints its analysis rather
  than writing a file, so refreshing them is a manual capture.

## 10. Known gaps

Recorded so they are not mistaken for design:

- **The error boundary covers the page and not the shell.** `common/ErrorBoundary.tsx` — the one
  class in the tree, since React exposes catching a render error through no hook — is mounted in
  `Google.tsx` around the outlet and the search host, inside the providers: a throw in a chart, a
  card or a colour lookup states itself on a `NoticeCard` carrying the error's own message and a
  Reload, and leaves the app bar, the tabs and the search key standing to leave the broken page by.
  It is keyed on the tab id, so a change of tab builds a fresh boundary and the next page draws
  without a reload. What it cannot catch is what renders above it: a throw in a `useState`
  initialiser, `LibraryProvider` wrapping `NavBar` and so standing higher — which is why
  `parseCachedItems` and `parseTokenWrapper` each guard a `JSON.parse` in one — and
  `initTokenClient({ client_id: CLIENT_ID })`, which runs in an effect in `GoogleAuthProvider` with
  no check, so a missing `VITE_GOOGLE_CLIENT_ID` still takes the app with it.
- **No loading state.** An entry component renders `{data && <Graphs/>}` beside its snackbar, so a
  page with nothing to draw draws nothing. The `empty` state has a card of its own now (§5), which
  covers the reader who has never authorised; the two windows either side of it are still bare. While
  `authorising` — the GIS and gapi scripts landing — a cold cache shows the bar with its key dimmed
  over an empty page, since the state cannot yet tell "nothing here" from "about to fetch". Once
  `live`, the sheet read runs behind the same empty page, and the Omnibus waits on all four sheets,
  so it waits longest.
- **Every visit reads all four ranges.** `app/LibraryProvider.tsx` mounts above the router, so any
  tab has the cross-media union and the bar can say whether there is a library at all; a deep link
  to `/games` therefore pays for three tabs it is not showing, where the Omnibus — which a bare visit
  opens on — needs all four regardless. A deliberate trade, argued in that provider's own comment.
  What it costs is now one request rather than four (§3), so what is left is the parsing: four
  converters run over four grids on the main thread whichever tab was asked for.
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
