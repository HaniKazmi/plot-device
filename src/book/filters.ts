import {
  certificateCategory,
  franchiseCategory,
  FRANCHISE_KEY,
  seriesCategory,
  type FilterSchema,
} from "../common/filterSchema";
import { CERTIFICATES, certificateToColour, genreToColour, type Certificate } from "../utils/types";
import type { FilterState } from "./filterUtils";
import { formatToColour, type Book } from "./types";

export const bookFilters: FilterSchema<Book, FilterState> = {
  toggles: [{ key: "unscored", label: "Unscored books", hides: (book) => book.score !== undefined }],
  categories: [
    { key: "genre", label: "genre", valueOf: (book) => book.genre, colourFor: genreToColour },
    { key: "format", label: "format", valueOf: (book) => book.format, colourFor: formatToColour },
    certificateCategory(
      "certificate",
      (book) => book.certificate,
      CERTIFICATES,
      (value, scheme) => certificateToColour(value as Certificate, scheme),
    ),
    { key: "author", label: "author", valueOf: (book) => book.author, searchable: true },
    seriesCategory("bookSeries", "book series"),
    franchiseCategory(FRANCHISE_KEY),
  ],
};
