import { certificateCategory, franchiseCategory, type FilterSchema } from "../common/filterSchema";
import {
  CERTIFICATE_BANDS,
  certificateBand,
  certificateBandToColour,
  genreToColour,
  mediumToLabel,
} from "../utils/types";
import type { OmniItem } from "../common/medium";
import type { FilterState } from "./filterUtils";
import { media } from "../app/types";

/**
 * The medium switches, which are this tab's toggles because a medium here is what a category is
 * elsewhere: turning two off is how the reader asks the same charts a narrower question.
 *
 * Built from the exported list rather than written out again, so a medium is switchable the moment
 * it exists rather than passing this page's filters unchallenged. A `Medium` is exactly the key
 * its own switch is held under, and `mediumToLabel` is the plural the rest of the app already says
 * that medium in.
 *
 * Genre and franchise are the two vocabularies all four media share, and both are derived from the
 * union rather than from any one sheet — the entries appearing in more than one of them are the
 * point of offering the filter here at all.
 */
export const omniFilters: FilterSchema<OmniItem, FilterState> = {
  toggles: media.map((medium) => ({
    key: medium,
    label: mediumToLabel(medium),
    hides: (item: OmniItem) => item.medium !== medium,
  })),
  categories: [
    {
      key: "genre",
      label: "genre",
      valueOf: (item) => item.genre,
      // The one ramp all three media's genres are drawn from, so a chip means the same thing
      // whichever medium's rows it is narrowing.
      colourFor: genreToColour,
    },
    // The band and not the cell: this page holds two boards' notations, where a BBFC 15 and a PEGI
    // 16 are one tier, and the gallery's own certificate shelves already group it that way. A book
    // carries none, answers `""` and drops off the category, as it drops off those shelves.
    certificateCategory<OmniItem>(
      (item) => (item.certificate ? certificateBand(item.certificate) : ""),
      CERTIFICATE_BANDS,
      certificateBandToColour,
    ),
    franchiseCategory(),
  ],
};
