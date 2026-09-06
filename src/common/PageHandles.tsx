import { FilterAlt } from "@mui/icons-material";
import { Badge } from "@mui/material";
import { RailChip } from "./ChipRail";
import { openPage, useSearchState } from "./searchOpen";
import { PickerButton } from "./SelectionComponents";

/**
 * The two handles on the page's own settings, both in the section rail, both opening the box in
 * This page mode (`common/SearchPalette.tsx`). The other handle on the same box is the app bar's
 * magnifier, which opens it in Find: one surface, two ways in, and which way in decides what the
 * box is for.
 */

/**
 * Where the page states how much of the library it is drawing, and the handle onto what set it.
 *
 * The word is the population — "309 shows" — because the filters are what moved it: a chip that
 * says both is the only place on the page where the figure and the control behind it are the same
 * object, which is why every chart below it stops restating the number. The badge counts the
 * fields the reader changed, since a library narrowed to one franchise otherwise looks exactly
 * like the whole library; `Badge` draws nothing for a zero, which is the right answer.
 *
 * It rides the rail from `sm` up. The rail is the one bar pinned at every scroll position, and a
 * figure stating what the page is drawing has to be legible from the library at the bottom of it,
 * not only from the top. Below `sm` the rail has no room for it and `PageChip` carries the badge
 * instead, the figure reading in the box's own footer.
 */
export const FilterChip = ({ label, activeCount }: { label: string; activeCount: number }) => (
  <Badge
    badgeContent={activeCount}
    color="secondary"
  >
    <RailChip
      label={label}
      icon={<FilterAlt />}
      ariaLabel={activeCount > 0 ? `${label}, ${activeCount} filters active` : label}
      active={activeCount > 0}
      onClick={openPage}
    />
  </Badge>
);

/**
 * The phone's one handle on everything the page is drawn through: the measure, the years and the
 * filters, behind a single control in the rail reading the measure with the filter badge on it.
 *
 * The measure is the word on it because it is the setting a reader changes most, and because the
 * three cannot all stand in a 358px rail — the chips are what the rail is for. The population the
 * desktop's chip states is in the box's own footer instead, beside the Clear that answers it.
 *
 * The picker's face rather than a chip's, since what it opens is a surface holding a page's
 * settings: a pill is the shape the rail's navigation wears, and the box is not somewhere the
 * reader is going. It opens rather than toggling — the box is modal, and the ✕, the backdrop and
 * Escape all leave it.
 */
export const PageChip = ({ measure, activeCount }: { measure: string; activeCount: number }) => {
  const { open, mode } = useSearchState();

  return (
    <Badge
      badgeContent={activeCount}
      color="secondary"
    >
      <PickerButton
        value={measure}
        // The word is the measure alone: a label beside it spends a fifth of the rail saying what
        // the box's own segment says on opening.
        ariaLabel={activeCount > 0 ? `This page: ${measure}, ${activeCount} filters active` : `This page: ${measure}`}
        lit={activeCount > 0}
        open={open && mode === "page"}
        onOpen={openPage}
      />
    </Badge>
  );
};
