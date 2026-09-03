# AGENTS.md

Working notes for coding agents. **Read [ARCHITECTURE.md](./ARCHITECTURE.md) before making non-trivial changes** — it explains the layering rule, the subsystem internals, and the reasoning behind decisions that otherwise look arbitrary. [README.md](./README.md) covers setup, scripts and repo layout.

This file is the stuff you only learn by breaking something.

<!-- Imports, for agents that support them. A Claude Code import is a bare `@path`
     on its own line; wrapping it in markdown link syntax imports nothing. -->

@./ARCHITECTURE.md
@./README.md

## Verification loop

```bash
npm test            # Vitest, ~0.5s
npx tsc --noEmit    # must print nothing
npm run lint        # must print nothing beyond the npm banner
npm run build       # tsc + vite build
npm run format      # prettier; run before committing
```

All of these pass cleanly on `master`, so any output is something you introduced. TypeScript is strict with `noUnusedLocals` and `noUnusedParameters`, which means dead imports left behind by an edit will fail the build rather than linger. `.github/workflows/ci.yml` runs the same three checks on every push and pull request.

For anything user-visible, run the app (see [Exercising the UI](#exercising-the-ui)) — neither the type checker nor the suite can tell you a chart renders.

## Tests

`tests/` mirrors `src/` one for one, so `tests/vg/converter.test.ts` covers `src/vg/converter.ts` and every test imports its subject at `../../src/<same path>`. Fixtures live in `tests/fixtures/`: raw sheet rows shaped the way `arrayToJson` hands them over, plus builders for whole domain objects.

The suite is pure logic. It runs in the `node` environment with no DOM, and `vitest.config.ts` is deliberately separate from `vite.config.ts` so the React Compiler's babel plugin stays out of the test transform. Vitest globals are off — import `describe`/`it`/`expect` explicitly, because switching them on would mean adding a `types` array to `tsconfig.json`, which would drop the `@types` packages `src/` currently picks up implicitly.

**Keep it unable to flake.** Every rule below is load-bearing:

- **No wall-clock assertions.** `CURRENT_YEAR` and `CURRENT_PLAINDATE` are computed at module load from the real clock, so a literal year turns into a failure on New Year's Day. Express expectations relative to `CURRENT_YEAR`. Do not compare anything against `CURRENT_PLAINDATE` by identity either — `currentDate()` bypasses the interning cache, so it is never `===` a `YearMonthDay.get()` of the same day.
- **No locale or timezone dependence.** `mathUtils.format` is an `Intl.NumberFormat` on the machine default locale; leave it untested. The `test` script pins `TZ=UTC`.
- **No network, gapi, OAuth, `localStorage`, or canvas.** Converters take literal fixtures, and the cache round-trip drives `JSON.stringify`/`JSON.parse` directly instead of going through `useData`.
- **No snapshots**, so a failure names the property that broke rather than showing a diff to skim.
- **Nothing asynchronous** — no timers, no promises, no `act()`.

There are no DOM or component tests, and adding them is a bigger decision than it looks: Highcharts needs stubbing, MUI needs a `matchMedia` polyfill, and `useTextPlacement` would assert nothing real because jsdom returns 0 for `getBoundingClientRect()` and `scrollWidth`, collapsing every branch to "center". `tests/architecture.test.ts` covers the failure a mount test would most likely catch — it reads the source files and enforces both the `common/`-never-imports-a-domain rule and the requirement that every caller of a prototype extension imports the module installing it.

A test can pin behaviour that is wrong but deliberate to leave alone for now, and say so in a comment. Do not "fix" the test when the behaviour is the thing under discussion — `assignPercents` (`utils/mathUtils.ts`) divides by an unguarded `total`, and `tests/utils/mathUtils.test.ts` pins the resulting non-finite percent rather than guarding the division.

## Formatting

Prettier is configured with `printWidth: 120` and **`singleAttributePerLine: true`**, so JSX in this repo puts every attribute on its own line. Run `npm run format` (or `npx prettier --write <files>`) rather than hand-formatting to match it — hand-matching this style is error-prone and produces noisy diffs.

## The React Compiler changes how you write components

The compiler is enabled and auto-memoizes render-phase work (§7 of ARCHITECTURE.md). Practical consequences:

- **Never add `useMemo` or `useCallback`.** If you catch yourself reaching for one, the compiler already handles it. Hand-placed memos are redundant and drift out of sync with their dependencies.
- **Never write `this` inside a component or hook.** It opts that whole function out of compilation, silently. Third-party callbacks that bind `this` (Highcharts does this on chart events) must live at module scope — see `dimLeafRing` in `common/Sunburst.tsx` for the pattern.
- **Never write `??=`.** The compiler cannot lower it yet and bails on the enclosing function. Write `x = x ?? y`.
- **Never give a destructured prop a default value.** `({ landscape = false })` is an assignment pattern the compiler cannot lower, and it takes the whole component out. Destructure without the default and read it off the props object — `const landscape = props.landscape ?? false` — or rename in the pattern (`landscape: landscapeProp`) and default below it when a rest spread must not pick the prop up.
- **Never write `import()` inside a component or hook.** The compiler cannot lower an import expression, and it bails on the enclosing function. Put the dynamic import in a module-scope function and call that — each entry component keeps its import in a module-scope `loadGraphs` that both its `lazy()` and its prefetch effect call, for exactly this reason.

`eslint-plugin-react-hooks@7`'s recommended config _is_ the compiler rule set, so `npm run lint` catches most violations. It does **not** catch the `this`, `??=` or destructured-default bailouts — those compile fine and just quietly lose memoization.

### Checking bailouts

After changing a hot component, confirm it still compiles. Temporarily wrap the preset in `vite.config.ts`:

```ts
babel({
  presets: [
    reactCompilerPreset({
      logger: {
        logEvent(filename, event) {
          if (event.kind === "CompileSuccess") console.log("OK " + filename);
          else if (event.kind === "CompileError" || event.kind === "CompileSkip")
            console.log("BAIL " + filename + " :: " + (event.detail?.reason ?? ""));
        },
      },
    }),
  ],
}),
```

Then `npx vite build 2>&1 | grep -E '^OK|^BAIL'`. Baseline is **222 compiled, 0 bailed** — any `BAIL` line is something you introduced. The commonest way to introduce one is a destructured prop default (`landscape = false`), which surfaces as `BuildHIR::lowerAssignment … got: AssignmentPattern`; the fix idiom is above. Moving a computation out of a component is a reliable way to clear a `MethodCall` bailout, which is a different failure and does respond. **Revert the logger afterwards.**

Do not grep the built bundle for `useMemoCache` or `compiler-runtime` to check this — those names do not survive minification, and their absence proves nothing.

## Traps

Ordered by how quietly they fail.

- **Never name a field `somethingDate` unless it is a `PlainDate`.** `useData`'s `JSON.parse` reviver converts _any_ key containing `"Date"`. A value that happens to be 4 or 10 characters comes back miscast as a `Year` or `YearMonthDay` with nothing to say so; any other length, or `null`, throws inside the reviver, which `parseCachedItems` catches and treats as an unreadable cache — the whole cached copy is dropped and refetched rather than crashing the render. Either way it only shows up after a reload.
- **Never read a browser global at module scope.** `const storage = localStorage` at the top of a module makes merely importing it throw wherever the global is absent. Node exposes `localStorage` and `sessionStorage` from v24 but not on v22, which CI runs, so this passes locally and fails there. Read the global inside the function that needs it. `tests/architecture.test.ts` enforces this.
- **Never put a bare colour after a comma in the `background` shorthand.** `background: linear-gradient(a, a), ${colour}` looks like an overlay over a colour and is not: only the last layer may carry a background-colour, and it is space-separated. A colour written as its own comma-separated layer is not a valid `<bg-image>`, so that half is dropped and the computed value reads `linear-gradient(a, a), none` — an overlay sitting on nothing. Set `backgroundImage` and `backgroundColour` as two properties instead.
- **Never add a field named `show` to a non-`show` domain.** `show/Show.tsx` passes a replacer that strips that key on cache write; it is scoped to that domain, but the name is the trigger.
- **Cache keys are versioned — bump the version when the model's shape changes.** `dataCacheKey(domain, version)` in `common/useData.ts` builds the key (`vg-data-cache-v2`, `show-data-cache-v3`, `movie-data-cache-v3`, `book-data-cache-v1`), and `dropSupersededVersions` clears the previous key on first load. A field added without a bump is simply absent on a returning visitor's cached objects — the component reading it fails, or worse reads a silent default, and only on other people's browsers.
- **`PlainDate.from()` throws on partial dates.** It dispatches on string length: 10 chars → `YearMonthDay`, 4 → `Year`. `"2024-05"` throws. That is deliberate — it surfaces bad sheet data loudly.
- **Colour lookups throw on unknown values** (`platformToShort`, `ratingToColour`). Also deliberate: it catches typos in the spreadsheet. Do not soften them to a fallback colour.
- **Every colour lookup takes a `Scheme`.** A fill is a `Fill` — a light/dark pair — so `genreToColour(genre)` alone does not type-check; components read the current paper from `useScheme()` and pure builders take it as a parameter. Reading `theme.palette.mode` instead gives the light scheme's literal whatever is on screen, because the theme is built with `cssVariables: true`.
- **A network is keyed on the string the sheet writes, not the brand's current name.** `HBO` is the sheet's value even though the brand is HBO Max; renaming the key silently drops the colour and the chart falls back to a palette hue with no error.
- **Adding a `Tab` to `src/tabs.ts` is two steps** — define it _and_ add it to the exported `Tabs` array. The router and nav bar are generated from that array, and so is the root route: `App.tsx` renders `Tabs[0].component` for `/`, and `tabForPath`'s fallback is also `tabs[0]`, so the array's order — not any flag on a `Tab` — decides which tab a bare visit opens on. Omnibus leads the array, which is why a bare visit opens on it.
- **`.eslintrc.cjs` is dead.** ESLint 9 uses the flat `eslint.config.js`. Editing the legacy file has no effect.
- **`extension/` is outside the Vite build.** Plain JS, loaded unpacked, shares no code with the app. `npm run build` does not touch it.

## Where code goes

The one rule that matters: **`common/` and `utils/` never import from `vg/`, `show/`, `movie/`, `books/` or `omnibus/`.** `tests/architecture.test.ts` enforces it by reading the source files.

- New _visualisation behaviour_ → `common/`, parameterised by props and callbacks.
- New _domain knowledge_ → the domain folder, as a thin adapter over a `common/` shell.

If a shell needs to branch on something domain-specific, that is a signal the prop is wrong — pass the decision in rather than detecting it. If the shared layer needs a domain vocabulary, declare it in the shared layer and let domain types stay assignable to it; do not import upward.

`omnibus/` is a domain folder itself, and the one that imports the other four (`vg/`, `show/`, `movie/`, `books/`) rather than a `common/` shell — that is composition between domains, not the shared layer reaching upward, so the rule above still holds unbroken.

## Exercising the UI

```bash
npm run dev   # http://localhost:5173
```

Authentication notes that will otherwise waste your time:

- The OAuth token lives in **`sessionStorage`, which is per-tab**. A login in one tab does not carry to another. Click **Authorise** in the app bar in the tab you are actually driving.
- A failed sheet fetch clears the token and flips the button back to "Authorise" — so an empty page plus an "Authorise" button usually means an auth problem, not a rendering bug. Check the console before assuming your change broke something.
- Data is cached in `localStorage`, so the app paints before auth completes. A stale render can outlive a broken change.
- **Extracted artwork colours arrive seconds after the page does**, and sometimes not at all until a reload. Anything painted from one — a card's ground, a footer strip, a hover panel — renders in the theme's own colours until then, which looks like the styling has broken rather than like it has not arrived. Confirm against a card whose colour has landed before concluding anything about colour-dependent CSS.

**To test without touching real data**, seed the caches directly and reload — `useData` reads them synchronously on mount, and with no token it will not overwrite them:

```js
localStorage.setItem("vg-data-cache-v2", JSON.stringify(games));
localStorage.setItem("show-data-cache-v3", JSON.stringify(shows));
localStorage.setItem("movie-data-cache-v3", JSON.stringify(movies));
localStorage.setItem("book-data-cache-v1", JSON.stringify(books));
```

Dates go in as ISO strings (`"2024-05-01"`); the reviver turns them into `PlainDate`s. Omit `Season.show` — the reviver re-attaches it. Values must be ones the colour maps recognise (see the trap above) or rendering throws. The version suffixes are whatever each domain's entry file currently passes to `dataCacheKey` — seeding the bare unversioned key seeds nothing, because `dropSupersededVersions` deletes it on load.

Seed all four whatever tab you are looking at: the shell mounts `FranchiseUnionProvider` (`omnibus/franchiseUnion.tsx`) above every tab, and a card's franchise strip draws the other media only once all four libraries are present — with three of them missing, every strip quietly falls back to its own tab's index and looks like the cross-media half has not been built.

The fastest way to get real data in front of a build without authorising is the service-account route: sign a JWT with the key in `~/.config/plot-device/sa.json`, read the four ranges named in `src/tabs.ts`, run each grid through its domain's `converter` under Vitest (the converters import the auth module, which reads `import.meta.env` at import time, so a bare TypeScript runner cannot load them), and write `JSON.stringify(items, config.replacer)` under `config.storageKey` — that is exactly what `useData` writes, so a page seeded with it paints as a returning visitor's would.

If you seed fake data, **clear those keys afterwards** so you do not leave test data in the user's browser.

## Conventions

- Prototype extensions are real here: `Array.prototype.sum` / `sortByKey` (`utils/arrayUtils.ts`) and `Map.prototype.setIfAbsent` (`utils/mapUtils.ts`). Prefer them over hand-rolled reduces and comparators — that is what the surrounding code does.
- `Colour` is a branded string; literals need an `as Colour` cast.
- Every `Graphs` module is `lazy()`-loaded, and its entry component calls a `usePrefetchGraphs` effect (see `vg/vg.tsx`) that starts `import("./Graphs")` on mount rather than waiting for `Graphs` to first render. Keep that pattern when adding a domain — bundle size is actively tracked.
- Use `PlainDate`, never JS `Date`, for anything tracked.
