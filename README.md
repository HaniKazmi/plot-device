# Plot Device

Plot Device is a personal data dashboard and media consumption tracker built with React, TypeScript, and Vite. It reads tracking data directly from Google Sheets and renders it as interactive Highcharts visualisations for Video Games, TV Shows and Movies, plus an Omnibus tab that composes all three into one cross-media view.

There is no backend and no database — a spreadsheet _is_ the storage layer, and every fetch, parse, aggregation and render happens in the browser. The deployed site is a static bundle on GitHub Pages.

**Further reading:** [ARCHITECTURE.md](./ARCHITECTURE.md) for how the system fits together and why; [AGENTS.md](./AGENTS.md) for working conventions and the verification loop.

## Features

- **Google Sheets as a backend** — reads via the Sheets API with a read-only scope; the app never writes.
- **Data visualisation** — stat cards, a packed SVG timeline, sunburst hierarchies you can re-nest at runtime, and bar/line/bump charts, powered by [Highcharts](https://www.highcharts.com/).
- **Media tracking** — Video Games, Shows and Movies, each with its own model, filters and theme colour.
- **Omnibus** — a fourth tab, and the one the app opens on, composing the other three's own data into a cross-media Now band, totals, a recently-finished list, a by-year chart with a Totals/Share/Cumulative/Rank view switch, a browsable gallery, and cross-media franchise crossings.
- **Client-side rendering** — Google Identity Services plus `gapi`, authenticating and fetching straight from the browser.
- **Cache-first loading** — the dashboard paints from `localStorage` before authentication completes, then refreshes.

## Tech stack

| Concern     | Choice                                                                   |
| ----------- | ------------------------------------------------------------------------ |
| Framework   | React 19 + TypeScript (strict, ES2025)                                   |
| Build       | Vite 8 with the [React Compiler](https://react.dev/learn/react-compiler) |
| UI          | Material-UI (MUI) v9 with CSS variables                                  |
| Charting    | Highcharts + `@highcharts/react`, plus a hand-rolled SVG timeline        |
| Routing     | React Router (`HashRouter`, for GitHub Pages)                            |
| Auth & data | Google Identity Services + `gapi`                                        |

## Getting started

### Prerequisites

- Node.js `^20.19.0 || >=22.12.0` (Vite 8's requirement)
- A Google Cloud project with the Google Sheets API enabled
- An OAuth 2.0 Client ID and an API key

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
VITE_GOOGLE_API_KEY=your_google_api_key_here
```

Without these the app still builds and loads, but authorisation fails and no data appears.

The spreadsheet IDs and cell ranges themselves live in [`src/tabs.ts`](./src/tabs.ts), which is the single source of truth for a data source.

### Running locally

```bash
npm run dev
```

The app is served at `http://localhost:5173`. Click **Authorise** in the app bar to grant access; the token is held in `sessionStorage` for that tab only.

## Scripts

| Command           | What it does                                                   |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | Vite dev server with HMR                                       |
| `npm run build`   | `tsc` then `vite build`                                        |
| `npm test`        | Vitest over `tests/`                                           |
| `npm run preview` | Serve the production build locally                             |
| `npm run lint`    | ESLint (flat config), including the React Compiler rules       |
| `npm run format`  | Prettier over the repo                                         |
| `npm run analyze` | Bundle breakdown via `source-map-explorer` (run after `build`) |
| `npm run deploy`  | Build and publish to GitHub Pages at `plot.hani.fyi`           |

Verification is `npm test`, `npx tsc --noEmit` and `npm run lint`; the last two are expected to produce no output. CI runs all three on every push and pull request.

Tests cover pure logic only — converters, filters, the reducer, the chart data transforms and the cache round trip — and there are deliberately no DOM or component tests. See [AGENTS.md](./AGENTS.md) for why, and for the rules that keep the suite from flaking.

## Repository layout

```
src/
  tabs.ts              data-source registry: sheet id, range, route, colours
  common/              domain-blind chart shells, date model, data hook
  utils/               prototype extensions, branded types, colour extraction
  vg/ show/ movie/     per-domain model, converter, filters, adapters
  omnibus/             composes vg/show/movie's own data; no sheet of its own
tests/                 mirrors src/, plus fixtures/ and an architecture guard
extension/             standalone Chrome extension, outside the Vite build
```

`extension/` is a Chrome MV3 extension loaded unpacked. It adds image context-menu items that hand off to macOS Shortcuts for uploading banner artwork, and is untouched by `npm run build`.

## License

This project is intended for personal use.
