# AGENTS.md

Working notes for coding agents. **Read [ARCHITECTURE.md](./ARCHITECTURE.md) before making non-trivial changes** — it explains the layering rule, the subsystem internals, and the reasoning behind decisions that otherwise look arbitrary. [README.md](./README.md) covers setup, scripts and repo layout.

This file is the stuff you only learn by breaking something.

<!-- Imports, for agents that support them. A Claude Code import is a bare `@path`
     on its own line; wrapping it in markdown link syntax imports nothing. -->

@./ARCHITECTURE.md
@./README.md

## Verification loop

```bash
npm test            # Vitest, ~2s
npx tsc --noEmit    # must print nothing
npm run lint        # must print nothing beyond the npm banner
npm run build       # tsc + vite build
npm run format      # prettier; run before committing
```

All of these pass cleanly on `master`, so any output is yours. TypeScript is strict with `noUnusedLocals` and `noUnusedParameters`, so a dead import fails the build. `.github/workflows/ci.yml` runs `tsc`, `lint`, `test` and `build` on Node 24 for every push and pull request, and deploys off a green run on `master`. For anything user-visible, run the app (see [Exercising the UI](#exercising-the-ui)): neither check can tell you a chart renders.

## Tests

`tests/` mirrors `src/` one for one across 61 files, each importing its subject at the mirrored `src/` path. `tests/fixtures/` holds raw sheet rows as `arrayToJson` hands them over, domain-object builders, and the independent WCAG implementation the fill contract is checked through.

The suite is pure logic in a `node` environment; `vitest.config.ts` stays separate from `vite.config.ts`, keeping the React Compiler's babel plugin out of the test transform. Vitest globals are off — import `describe`/`it`/`expect` explicitly, since a `types` array in `tsconfig.json` would drop the `@types` packages `src/` picks up implicitly.

**Keep it unable to flake.** Every rule below is load-bearing:

- **No wall-clock assertions.** `CURRENT_YEAR` and `CURRENT_PLAINDATE` (`common/date.ts`) come from the real clock at module load, so a literal year fails on New Year's Day; express expectations relative to `CURRENT_YEAR`. Never test `CURRENT_PLAINDATE` by identity either: `currentDate()` bypasses the interning cache, so it is never `===` a `YearMonthDay.get()` of that day.
- **No locale or timezone dependence.** `mathUtils.format` is an `Intl.NumberFormat` on the machine default locale; leave it untested. The `test` script pins `TZ=UTC`.
- **No network, gapi, OAuth, `localStorage`, or canvas.** Converters take literal fixtures, and the cache round-trip drives `JSON.stringify`/`JSON.parse` rather than `useData`.
- **No snapshots**, so a failure names the property that broke.
- **Nothing asynchronous** — no timers, no promises, no `act()`.

There are no DOM or component tests. `tests/architecture.test.ts` covers what a mount test would most likely catch: it parses the sources and enforces four rules: `common/` and `utils/` import no domain; a tracked domain (`vg/`, `show/`, `movie/`, `books/`) imports neither another domain nor `omnibus/`; every prototype-extension caller imports the module installing it; and no module but `main.tsx` reads a browser global at module scope.

A test can pin behaviour that is wrong but deliberate, with a comment saying so — `assignPercents` (`utils/mathUtils.ts`) divides by an unguarded `total` and its test pins the non-finite percent. Leave such a test alone.

## Formatting

Prettier is configured with `printWidth: 120` and **`singleAttributePerLine: true`**, so JSX here puts every attribute on its own line. Run `npm run format` (or `npx prettier --write <files>`) rather than hand-formatting to match it.

## The React Compiler changes how you write components

The compiler is enabled and auto-memoizes render-phase work (§7 of ARCHITECTURE.md). Practical consequences:

- **Never add `useMemo` or `useCallback`.** The compiler handles it, and hand-placed memos rot.
- **Never write `this` inside a component or hook.** It opts that function out of compilation, silently. Callbacks that bind `this` (Highcharts does, on chart events) belong at module scope — `dimLeafRing` in `common/Sunburst.tsx`.
- **Never write `??=`.** It cannot be lowered, and bails on the enclosing function. Write `x = x ?? y`.
- **Never give a destructured prop a default value.** `({ landscape = false })` is an assignment pattern that cannot be lowered, and it takes the whole component out. Read the default off the props object (`props.landscape ?? false`), or rename in the pattern and default below it.
- **Never write `import()` inside a component or hook.** An import expression cannot be lowered either; put it in a module-scope function, as each `loadGraphs` does.

`npm run lint` runs the compiler rule set (`eslint-plugin-react-hooks@7`), but it catches none of the `this`, `??=` or destructured-default bailouts: those compile fine and lose memoization quietly.

### Checking bailouts

After changing a hot component, confirm it compiles: temporarily wrap the preset in `vite.config.ts`,

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

Then `npx vite build 2>&1 | grep -E '^OK|^BAIL'`. Baseline is **222 compiled, 0 bailed** — any `BAIL` line is yours. The commonest cause is a destructured prop default, surfacing as `BuildHIR::lowerAssignment … got: AssignmentPattern`; a `MethodCall` bailout is a different failure, cleared by moving the computation out of the component. **Revert the logger afterwards.** Grepping the bundle for `useMemoCache` proves nothing instead — minification eats the name.

## Traps

Ordered by how quietly they fail.

- **Never name a field `somethingDate` unless it is a `PlainDate`.** `useData`'s reviver converts _any_ key containing `"Date"`: a 4- or 10-character value is miscast as a `Year` or `YearMonthDay`, anything else throws and drops the whole cached copy, and either way only after a reload.
- **Never read a browser global at module scope.** `const storage = localStorage` at the top of a module makes importing it throw where the global is absent, the Vitest `node` environment included; read it inside the function that needs it, or behind a `typeof` check. The guard covers `localStorage`, `sessionStorage`, `document`, `window` and `navigator`.
- **Never put a bare colour after a comma in the `background` shorthand.** Only the last layer carries a background-colour, space-separated, so `linear-gradient(a, a), ${colour}` computes to `linear-gradient(a, a), none`. Set the two properties separately.
- **Never add a field named `show` to a non-`show` domain.** `showDataConfig`'s replacer `dropSeasonParents` (`show/converter.ts`) strips that key on cache write.
- **Cache keys are versioned — bump the version when the model's shape changes.** Each `converter.ts` passes its version to `dataCacheKey` (`common/useData.ts`): `vg-data-cache-v2`, `show-data-cache-v3`, `movie-data-cache-v3`, `book-data-cache-v1`. Without a bump the new field is silently absent from a returning visitor's cache, on their browser alone.
- **`PlainDate.from()` throws on partial dates.** It dispatches on length: 10 chars → `YearMonthDay`, 4 → `Year`, and `"2024-05"` throws — deliberately, to surface bad sheet data loudly.
- **Colour lookups throw on unknown values** — `platformToShort` and `platformToColor` (`vg/types.ts`), `ageRatingBand` and `ageRatingToColour` (`utils/types.ts`) — deliberately, to catch spreadsheet typos. The open-ended vocabularies are the exceptions: genre falls to `NEUTRAL_FILL`, franchise and `networkToColour` to `""`. Soften neither kind.
- **Every colour lookup takes a `Scheme`.** A fill is a light/dark `Fill`, so `genreToColour(genre)` alone does not type-check: components read the paper from `useScheme()`, pure builders take it as a parameter. Never reach for `theme.palette.mode`, which gives the light literal on either paper.
- **A network is keyed on the string the sheet writes.** `HBO` is that value where the brand is HBO Max; renaming it silently drops the colour.
- **Adding a `Tab` to `src/tabs.ts` is two steps** — define it _and_ add it to the exported `Tabs` array, which generates router, nav bar and root route. `App.tsx` renders `Tabs[0].component` for `/`, so Omnibus leads the array and a bare visit opens there.
- **`.eslintrc.cjs` is dead.** ESLint 10 reads the flat `eslint.config.js`.
- **`extension/` is outside the Vite build.** Plain JS, loaded unpacked, sharing no code with the app.

## Where code goes

The one rule that matters: **`common/` and `utils/` never import from `vg/`, `show/`, `movie/`, `books/` or `omnibus/`.**

- New _visualisation behaviour_ → `common/`, parameterised by props and callbacks.
- New _domain knowledge_ → the domain folder, as a thin adapter over a `common/` shell.

A shell that branches on something domain-specific has the wrong prop. Where the shared layer needs a domain vocabulary, declare it there and let domain types stay assignable to it. `omnibus/` is a domain folder itself, and the one that imports the other four: composition between domains, not the shared layer reaching upward. The four tracked domains compose nothing.

## Exercising the UI

```bash
npm run dev   # http://localhost:5173
```

Authentication notes that otherwise waste your time:

- The OAuth token lives in **`sessionStorage`, per-tab**. Click **Authorise** in the tab you are driving.
- A failed `values.get` clears the token, so an empty page plus an "Authorise" button usually means auth rather than rendering. A converter throw is deliberately not guarded that way; it reports itself through the snackbar.
- Data is cached in `localStorage`, so the app paints before auth completes: a stale render can outlive a broken change.
- **Extracted artwork colours arrive seconds after the page does**, sometimes only on a reload. Until then a card wears the theme's own colours, which reads as broken styling.

**To test without real data**, seed the caches and reload — `useData` reads them on mount, and with no token it never overwrites them:

```js
localStorage.setItem("vg-data-cache-v2", JSON.stringify(games));
localStorage.setItem("show-data-cache-v3", JSON.stringify(shows));
localStorage.setItem("movie-data-cache-v3", JSON.stringify(movies));
localStorage.setItem("book-data-cache-v1", JSON.stringify(books));
```

Dates go in as ISO strings (`"2024-05-01"`); omit `Season.show`, which the reviver re-attaches. Values must be ones the colour maps recognise, and the unversioned key seeds nothing, since `dropSupersededVersions` deletes it. Seed all four whatever tab you are on: `Google.tsx` mounts `FranchiseUnionProvider` (`omnibus/franchiseUnion.tsx`) above every tab, and a card's franchise strip draws the other media only once all four libraries are present.

For real data without authorising, take the service-account route: sign a JWT with the key in `~/.config/plot-device/sa.json`, read the ranges in `src/tabs.ts`, run each grid through its domain's `converter` under Vitest — a converter reaches the auth module, which reads `import.meta.env` at import — and write `JSON.stringify(items, config.replacer)` under `config.storageKey`.

If you seed fake data, **clear those keys afterwards**.

## Conventions

- Prototype extensions are real here: `Array.prototype.sum` / `sortByKey` (`utils/arrayUtils.ts`) and `Map.prototype.setIfAbsent` (`utils/mapUtils.ts`). Prefer them to hand-rolled reduces, and import the installing module wherever you call one.
- `Colour` is a branded string; literals need an `as Colour` cast, or the `fill(light, dark)` helper.
- Every `Graphs` module is `lazy()`-loaded, and its entry component's `usePrefetchGraphs` effect (see `vg/vg.tsx`) starts `import("./Graphs")` on mount. Keep that pattern — bundle size is actively tracked.
- Use `PlainDate`, never JS `Date`, for anything tracked.
