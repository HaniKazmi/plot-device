# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Follow [AGENTS.md](./AGENTS.md).** It is the single source of truth for working in this repo — the verification loop, the React Compiler constraints on how components must be written, the quiet failure modes, and how to exercise the UI.

It in turn points to:

- [ARCHITECTURE.md](./ARCHITECTURE.md) — how the system fits together and why. Read this before non-trivial changes.
- [README.md](./README.md) — setup, scripts, repo layout.

Two things worth knowing before you touch anything, both covered in full in AGENTS.md:

- There is **no test framework**. Verification is `npx tsc --noEmit` plus `npm run lint`, and both are expected to produce no output.
- The **React Compiler** is enabled, so do not hand-write `useMemo`/`useCallback`, and never write `this` or `??=` inside a component — either silently disables memoization for that function.
