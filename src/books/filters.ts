import { categoryOptions, franchiseOptions } from "../common/filterOptions";
import type { FilterSchema } from "../common/filterSchema";
import { genreToColour } from "../utils/types";
import type { FilterState } from "./filterUtils";
import { formatToColour, type Book } from "./types";

export const bookFilters: FilterSchema<Book, FilterState> = {
  toggles: [{ key: "unscored", label: "Unscored books", hides: (book) => book.score !== undefined }],
  categories: [
    { key: "genre", label: "genre", valueOf: (book) => book.genre, colourFor: genreToColour },
    { key: "format", label: "format", valueOf: (book) => book.format, colourFor: formatToColour },
    { key: "author", label: "author", valueOf: (book) => book.author, searchable: true },
    {
      key: "series",
      label: "series",
      valueOf: (book) => book.series,
      // The default keeps `""`, and a standalone book answers it: six blank chips would be one
      // that selects nothing a reader can name.
      options: (data) => categoryOptions(data, (book) => book.series).filter(Boolean),
    },
    {
      key: "franchise",
      label: "franchise",
      valueOf: (book) => book.franchise,
      options: (data) =>
        franchiseOptions(
          data,
          (book) => book.franchise,
          (book) => book.name,
        ),
      searchable: true,
    },
  ],
};
