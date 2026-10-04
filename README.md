# Plot Device

Plot Device is a personal data dashboard and media consumption tracker built with React, TypeScript and Vite. It reads tracking data directly from Google Sheets and renders it as interactive Highcharts visualisations for Video Games, TV Shows, Movies and Books, plus an Omnibus tab that composes all four into one cross-media view.

There is no database — a spreadsheet _is_ the storage layer, and every parse, aggregation and render happens in the browser. The deployed site is a static bundle on GitHub Pages; one small Cloud Run function reads the sheets for it, so signing in lasts a month rather than an hour.

**Further reading:** [ARCHITECTURE.md](./ARCHITECTURE.md) for how the system fits together and why; [AGENTS.md](./AGENTS.md) for working conventions and the verification loop.

## Features

- **Google Sheets as a backend** — read by a service account with Viewer access and a read-only scope; the app never writes.
- **Data visualisation** — stat cards, a timeline laid out across the years or stacked a row per year, sunburst hierarchies you can re-nest at runtime, and bar/line/bump charts, powered by [Highcharts](https://www.highcharts.com/).
- **Media tracking** — Video Games, Shows, Movies and Books, each with its own model, filters and theme colour.
- **A library on every tab** — every work with artwork, shelved by when it was finished, its franchise, its genre or the tab's own fields, as rows that scroll sideways or a wall that wraps, one card per work or per franchise.
- **Search and filters as one box** — ⌘K or `/` finds a work, a franchise or an attribute across all four libraries; the section rail's own chip opens the same box on the current page's settings and filters. A genre typed in Find opens every game, show, film and book carrying it, or takes you to any of the five tabs that record it with the filter already set.
- **Franchises across media** — every expanded card and hero places its item among the whole franchise, games beside seasons beside films beside books, as a chain in the order met or against a window of the franchise's own years.
- **A page per franchise** — every franchise the search box finds has a page of its own: its totals, a dossier, its genres and where it was met, its timeline or hours by year, who made it and what else they made, and its works shelved by series.
- **Omnibus** — a fifth tab, and the one the app opens on, composing the other four's own data into a cross-media Now band, totals, a timeline of everything, a recently-finished list, a by-year chart with a Totals/Share/Cumulative/Rank view switch, franchises over time, and a library of shelves.
- **Sign in once a month** — Google sign-in buys a month-long session from the sheets function (`functions/sheets/`), which reads the four ranges with its own service account and hands back the raw grids for the browser to parse.
- **Cache-first loading** — the dashboard paints from `localStorage` before authentication completes, then refreshes.
- **Phone and tablet layouts** — a bottom tab bar, most charts folded to a one-line summary until opened, the box and the hover cards as full-width sheets, and layouts that adapt by pointer as well as by width.

## Tech stack

| Concern     | Choice                                                                   |
| ----------- | ------------------------------------------------------------------------ |
| Framework   | React 19 + TypeScript (strict, ES2025)                                   |
| Build       | Vite 8 with the [React Compiler](https://react.dev/learn/react-compiler) |
| UI          | Material-UI (MUI) v9 with CSS variables                                  |
| Charting    | Highcharts + `@highcharts/react`, plus a hand-rolled SVG timeline        |
| Routing     | React Router (`HashRouter`, for GitHub Pages)                            |
| Auth & data | Google Identity Services + a Cloud Run function (`functions/sheets/`)    |
| Lint & test | ESLint 10 (flat config) + Vitest                                         |

## Getting started

### Prerequisites

- Node.js `^20.19.0 || >=22.12.0` (Vite 8's requirement; CI runs 24)
- A Google Cloud project with the Google Sheets API enabled
- An OAuth 2.0 Client ID
- The sheets function, deployed or run locally — see [`functions/sheets/README.md`](./functions/sheets/README.md)

### Installation

```bash
git clone https://github.com/HaniKazmi/plot-device.git
cd plot-device
npm install
```

### Configuration

Create a `.env.local` in the project root:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
VITE_SHEETS_URL=https://your-sheets-function-url
```

Both are inlined at build time. The build succeeds without them, but the app does not work: without the client id the page comes up blank — `GoogleAuthProvider` hands `initTokenClient` an undefined client id as soon as the sign-in script loads, that throws, and the page's own error boundary is mounted below the provider that threw — and without the function's URL every read goes to `undefined/values`. For local work on the read path, run the function locally and set `VITE_SHEETS_URL=http://localhost:8090`.

The spreadsheet ID and cell ranges themselves live in [`src/tabs.ts`](./src/tabs.ts), which is the single source of truth for a data source.

### Running locally

```bash
npm run dev
```

The app is served at `http://localhost:5173`. Click the **key** in the app bar to grant access: it is there at every width whenever there is something to authorise, wearing the word "Authorise" from `md` up with a fine pointer, and it carries a dot while the page is painted from a cached copy. The app bar's **⋮** holds the tab's Sheet, Sign out and guest mode, at every width and pointer. The session is held in `localStorage`, so every tab on the origin shares it until it expires a month later.

## Scripts

| Command              | What it does                                                   |
| -------------------- | -------------------------------------------------------------- |
| `npm run dev`        | Vite dev server with HMR                                       |
| `npm run build`      | `tsc` then `vite build`                                        |
| `npm test`           | Vitest over `tests/`, with `TZ=UTC` pinned                     |
| `npm run test:watch` | The same suite in watch mode                                   |
| `npm run preview`    | Serve the production build locally                             |
| `npm run lint`       | ESLint (flat config), including the React Compiler rules       |
| `npm run format`     | Prettier over the repo                                         |
| `npm run analyze`    | Bundle breakdown via `source-map-explorer` (run after `build`) |
| `npm run deploy`     | Build and publish to GitHub Pages at `plot.hani.fyi`           |

Verification is `npm test`, `npx tsc --noEmit` and `npm run lint`; the last two are expected to produce no output. CI runs those three plus `npm run build` on every push and pull request, with the sheets function's own typecheck and suite beside them, and deploys the site from `master` once they pass.

Tests cover pure logic only — converters, filters, the reducer, the chart data transforms and the cache round trip — and there are deliberately no DOM or component tests. See [AGENTS.md](./AGENTS.md) for why, and for the rules that keep the suite from flaking.

## Repository layout

```
src/
  tabs.ts              data-source registry: sheet id, range, route, colours
  contexts/            sign-in provider and session helpers
  common/              domain-blind chart shells, date model, data hook
  utils/               prototype extensions, branded types, colour extraction
  app/                 the medium registry, the library provider, and the union,
                       search and franchise-view code composed over all four domains
  game/ show/ movie/     per-domain model, converter, filters, adapters
  book/                the same shape over the Books tab
  omnibus/             the fifth tab, composing nothing; no sheet of its own
tests/                 mirrors src/, plus fixtures/ and an architecture guard
functions/sheets/      the Cloud Run function that reads the sheets; its own package
extension/             standalone Chrome extension, outside the Vite build
```

`extension/` is a Chrome MV3 extension loaded unpacked. It adds image context-menu items that upload game, show and movie artwork straight to the Cloud Storage buckets the sheets' `Artwork` cells point into, and is untouched by `npm run build`.

## License

This project is intended for personal use.
