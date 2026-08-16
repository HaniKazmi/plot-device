# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Follow [AGENTS.md](./AGENTS.md).** It is the single source of truth for working in this repo — the verification loop, the React Compiler constraints on how components must be written, the quiet failure modes, and how to exercise the UI.

It in turn points to:

- [ARCHITECTURE.md](./ARCHITECTURE.md) — how the system fits together and why. Read this before non-trivial changes.
- [README.md](./README.md) — setup, scripts, repo layout.

Two things worth knowing before you touch anything, both covered in full in AGENTS.md:

- Verification is `npm test`, `npx tsc --noEmit` and `npm run lint`. The last two are expected to produce no output. Tests are **pure logic only** and live in `tests/`, mirroring `src/`; the rules that keep them from flaking are in AGENTS.md.
- The **React Compiler** is enabled, so do not hand-write `useMemo`/`useCallback`, and never write `this` or `??=` inside a component — either silently disables memoization for that function.

<!-- Imports. A Claude Code import is a bare `@path` token on its own line; it is
     NOT recognised inside markdown link syntax, so `[AGENTS.md](@./AGENTS.md)`
     imports nothing — it is just a link with a broken URL. Keep the readable
     links above and the import directives here. AGENTS.md imports ARCHITECTURE.md
     and README.md in turn, so all three load from this one line. -->

@./AGENTS.md
