import type { ReactNode } from "react";
import { franchiseIndex } from "../common/franchiseIndex";
import {
  bookEpoch,
  bookFranchise,
  BookEpochProvider,
  FranchiseContext as BookFranchiseContext,
} from "../book/franchiseContext";
import { FranchiseContext as MovieFranchiseContext, movieFranchise } from "../movie/franchiseContext";
import { FranchiseContext as ShowFranchiseContext, showFranchise } from "../show/franchiseContext";
import { FranchiseContext as GameFranchiseContext, gameFranchise } from "../game/franchiseContext";
import type { Library } from "../app/library";

/**
 * The four franchise indexes the domains' own cards read, and the scale the Books strips draw on.
 *
 * A card drawn on this tab or on a franchise's page is the domain's card, strip and all, and the
 * strip asks its domain's context for the rest of the series. Without the providers every strip
 * would hold the one item it was opened from — a wrong answer rather than a missing one. The
 * indexes are built from the guest-filtered libraries, which is the one filter a strip must honour.
 * The Books epoch travels the same way for the same reason: a book's strip here has to open where it
 * opens on its own tab.
 */
const FranchiseProviders = ({ library, children }: { library: Library; children: ReactNode }) => (
  <GameFranchiseContext.Provider value={franchiseIndex(library.game, gameFranchise)}>
    <ShowFranchiseContext.Provider value={franchiseIndex(library.show, showFranchise)}>
      <MovieFranchiseContext.Provider value={franchiseIndex(library.movie, movieFranchise)}>
        <BookFranchiseContext.Provider value={franchiseIndex(library.book, bookFranchise)}>
          <BookEpochProvider value={bookEpoch(library.book)}>{children}</BookEpochProvider>
        </BookFranchiseContext.Provider>
      </MovieFranchiseContext.Provider>
    </ShowFranchiseContext.Provider>
  </GameFranchiseContext.Provider>
);

export default FranchiseProviders;
