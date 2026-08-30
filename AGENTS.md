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

Several tests pin behaviour that is wrong but deliberate to leave alone for now, and they say so in a comment. Do not "fix" the test when the behaviour is the thing under discussion — the show converter's pre-2006 orphan crash and the unguarded division in `assignPercents` are both recorded that way.

## Formatting

Prettier is configured with `printWidth: 120` and **`singleAttributePerLine: true`**, so JSX in this repo puts every attribute on its own line. Run `npm run format` (or `npx prettier --write <files>`) rather than hand-formatting to match it — hand-matching this style is error-prone and produces noisy diffs.

## The React Compiler changes how you write components

The compiler is enabled and auto-memoizes render-phase work (§7 of ARCHITECTURE.md). Practical consequences:

- **Never add `useMemo` or `useCallback`.** If you catch yourself reaching for one, the compiler already handles it. Hand-placed memos are redundant and drift out of sync with their dependencies.
- **Never write `this` inside a component or hook.** It opts that whole function out of compilation, silently. Third-party callbacks that bind `this` (Highcharts does this on chart events) must live at module scope — see `dimLeafRing` in `common/Sunburst.tsx` for the pattern.
- **Never write `??=`.** The compiler cannot lower it yet and bails on the enclosing function. Write `x = x ?? y`.

`eslint-plugin-react-hooks@7`'s recommended config _is_ the compiler rule set, so `npm run lint` catches most violations. It does **not** catch the `this` and `??=` bailouts — those compile fine and just quietly lose memoization.

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

Then `npx vite build 2>&1 | grep -E '^OK|^BAIL'`. Baseline is **102 compiled, 8 bailed**, spread across `common/Card.tsx`, `common/Stats.tsx`, `common/Finished.tsx` and `vg/Stats.tsx`. Every one of them is the same compiler-internal limit — `BuildHIR::lowerAssignment … got: AssignmentPattern`, which is a destructured prop carrying a default value (`landscape = false`). Compare against that, not against zero. Moving a computation out of a component is a reliable way to clear a `MethodCall` bailout, which is a different failure and does respond. **Revert the logger afterwards.**

Do not grep the built bundle for `useMemoCache` or `compiler-runtime` to check this — those names do not survive minification, and their absence proves nothing.

## Traps

Ordered by how quietly they fail.

- **Never name a field `somethingDate` unless it is a `PlainDate`.** `useData`'s `JSON.parse` reviver converts _any_ key containing `"Date"`, so a `lastUpdateDate: string` comes back from cache as a broken date object. Only shows up after a reload.
- **Never read a browser global at module scope.** `const storage = localStorage` at the top of a module makes merely importing it throw wherever the global is absent. Node exposes `localStorage` and `sessionStorage` from v24 but not on v22, which CI runs, so this passes locally and fails there. Read the global inside the function that needs it. `tests/architecture.test.ts` enforces this.
- **Never put a bare colour after a comma in the `background` shorthand.** `background: linear-gradient(a, a), ${colour}` looks like an overlay over a colour and is not: only the last layer may carry a background-colour, and it is space-separated. A colour written as its own comma-separated layer is not a valid `<bg-image>`, so that half is dropped and the computed value reads `linear-gradient(a, a), none` — an overlay sitting on nothing. Set `backgroundImage` and `backgroundColour` as two properties instead.
- **Never add a field named `show` to a non-`show` domain.** `show/Show.tsx` passes a replacer that strips that key on cache write; it is scoped to that domain, but the name is the trigger.
- **Cache keys are unversioned.** Changing a domain model's shape leaves stale objects in existing browsers' `localStorage`. When testing a model change, clear the relevant `*-data-cache` key first, or you will debug the old shape.
- **`PlainDate.from()` throws on partial dates.** It dispatches on string length: 10 chars → `YearMonthDay`, 4 → `Year`. `"2024-05"` throws. That is deliberate — it surfaces bad sheet data loudly.
- **Colour lookups throw on unknown values** (`platformToShort`, `ratingToColour`). Also deliberate: it catches typos in the spreadsheet. Do not soften them to a fallback colour.
- **Adding a `Tab` to `src/tabs.ts` is two steps** — define it _and_ add it to the exported `Tabs` array. The router and nav bar are generated from that array. `HolidaysTab` is defined but intentionally omitted, which is why `src/holiday/` is unreachable. It is unfinished, not broken; leave it alone unless asked.
- **`.eslintrc.cjs` is dead.** ESLint 9 uses the flat `eslint.config.js`. Editing the legacy file has no effect.
- **`extension/` is outside the Vite build.** Plain JS, loaded unpacked, shares no code with the app. `npm run build` does not touch it.

## Where code goes

The one rule that matters: **`common/` and `utils/` never import from `vg/`, `show/`, `movie/` or `holiday/`.**

- New _visualisation behaviour_ → `common/`, parameterised by props and callbacks.
- New _domain knowledge_ → the domain folder, as a thin adapter over a `common/` shell.

If a shell needs to branch on something domain-specific, that is a signal the prop is wrong — pass the decision in rather than detecting it. If the shared layer needs a domain vocabulary, declare it in the shared layer and let domain types stay assignable to it; do not import upward.

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
localStorage.setItem("vg-data-cache", JSON.stringify(games));
localStorage.setItem("show-data-cache", JSON.stringify(shows));
localStorage.setItem("movie-data-cache", JSON.stringify(movies));
```

Dates go in as ISO strings (`"2024-05-01"`); the reviver turns them into `PlainDate`s. Omit `Season.show` — the reviver re-attaches it. Values must be ones the colour maps recognise (see the trap above) or rendering throws.

If you seed fake data, **clear those keys afterwards** so you do not leave test data in the user's browser.

## Conventions

- Prototype extensions are real here: `Array.prototype.sum` / `sortByKey` (`utils/arrayUtils.ts`) and `Map.prototype.setIfAbsent` (`utils/mapUtils.ts`). Prefer them over hand-rolled reduces and comparators — that is what the surrounding code does.
- `Colour` is a branded string; literals need an `as Colour` cast.
- Every `Graphs` module is `lazy()`-loaded with a `webpackPrefetch` comment. Keep that pattern when adding a domain — bundle size is actively tracked.
- Use `PlainDate`, never JS `Date`, for anything tracked.
