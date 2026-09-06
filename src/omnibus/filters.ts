import { certificateCategory, franchiseCategory, FRANCHISE_KEY, type FilterSchema } from "../common/filterSchema";
import { CERTIFICATE_BANDS, certificateBandToColour, genreToColour, mediumToLabel } from "../utils/types";
import type { OmniItem } from "../common/medium";
import type { FilterState } from "./filterUtils";
import { media } from "../app/types";
import { galleryValue } from "../app/galleryData";

/**
 * The medium switches, which are this tab's toggles because a medium here is what a category is
 * elsewhere: turning two off is how the reader asks the same charts a narrower question.
 *
 * Built from the exported list rather than written out again, so a medium is switchable the moment
 * it exists rather than passing this page's filters unchallenged. A `Medium` is exactly the key
 * its own switch is held under, and `mediumToLabel` is the plural the rest of the app already says
 * that medium in.
 *
 * Genre and franchise are the vocabularies all four media share, and both are derived from the
 * union rather than from any one sheet — the entries appearing in more than one of them are the
 * point of offering the filter here at all. The certificate is the third and is not shared by all
 * four: nothing certifies a book, so a book answers `""` and drops off that row.
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
    // Through `galleryValue`, which is where this page's answer to what a certificate is already
    // lives: the band and not the cell, two boards' notations meeting here and a BBFC 15 sitting at
    // the same tier as a PEGI 16. Asked here a second time, the shelves and the chart could come to
    // group by one rule and the filter by another. A book carries none, answers `""` and drops off
    // the category, as it drops off those shelves.
    certificateCategory(
      "certificate",
      (item) => galleryValue(item, "certificate"),
      CERTIFICATE_BANDS,
      certificateBandToColour,
    ),
    franchiseCategory(FRANCHISE_KEY),
  ],
};
