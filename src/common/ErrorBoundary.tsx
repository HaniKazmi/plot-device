import { Button } from "@mui/material";
import { Component, type ReactNode } from "react";
import { NoticeCard } from "./NoticeCard";

interface BoundaryState {
  /** What the throw said, kept so the card can state it; `undefined` while nothing has thrown. */
  message?: string;
}

/**
 * The one thing standing between a throw anywhere in the page and a blank white screen.
 *
 * React unmounts the whole tree at an error with no boundary above it, so a single bad row, a
 * chart shell handed a shape it does not expect, or a colour lookup on a spreadsheet typo takes
 * the app down with nothing on screen and nothing in the page saying so. Mounted around the page's
 * content alone (`Google.tsx`), which leaves the app bar drawn: the way out of a broken page is a
 * different tab, and a boundary above the bar would take that with it.
 *
 * A class, and the only one here: catching a render error is the one thing React exposes through
 * no hook. `this` inside a *component* opts it out of the React Compiler silently, which is why
 * the rule elsewhere is absolute; a class is not a function the compiler ever considers, so this
 * costs the memoization of nothing.
 *
 * The error's own message is stated rather than hidden behind a generic apology, since the sheet
 * is the reader's own and the message names the row to fix.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = {};

  static getDerivedStateFromError(error: unknown): BoundaryState {
    // A throw carries whatever was thrown, which is an `Error` here and need not be.
    return { message: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.message === undefined) return this.props.children;

    return (
      <NoticeCard
        title="Something went wrong"
        body={this.state.message}
        action={
          // `location` is read inside the handler: at module scope it would throw where the global
          // is absent, which is every test process that imports this file.
          <Button
            size="small"
            variant="contained"
            onClick={() => location.reload()}
            sx={{ minHeight: 32, paddingX: 1.75 }}
          >
            Reload
          </Button>
        }
      />
    );
  }
}
