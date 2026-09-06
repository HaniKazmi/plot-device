import { Clear, FilterAlt, type SvgIconComponent } from "@mui/icons-material";
import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  SwipeableDrawer,
  Switch,
  ToggleButton,
  Typography,
} from "@mui/material";
import { usePhone } from "./breakpoints";
import { SheetBar } from "./SheetBar";
import { sheetBarRow } from "./fullscreenSheet";
import Grid from "@mui/material/Grid";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Colour } from "../utils/types";
import { toValueArray } from "./filterOptions";
import { setFilterSheetOpen, useFilterSheetOpen } from "./filterSheet";
import { RailChip } from "./ChipRail";
import { PickerButton } from "./SelectionComponents";
import { narrowedTo } from "./population";

/**
 * Whether the filters are being drawn as a phone's bottom sheet.
 *
 * `FilterToggle` is built by a domain and handed to the drawer as a slot, so it cannot be told
 * which layout it landed in through a prop — but it is rendered inside the drawer's own tree,
 * which is what a context reaches. The alternative is drawing both a switch and a chip at every
 * width and hiding one, which mounts two of every control on the page.
 */
const SheetContext = createContext(false);

/**
 * The one handle on the filters, and where the page states how much of the library it is drawing.
 *
 * The word is the population — "309 shows" — because the filters are what set it: a chip that
 * says both is the only place on the page where the figure and the control that moved it are the
 * same object, which is why every chart below it stops restating the number. The badge counts the
 * fields the reader changed, since a library narrowed to one franchise otherwise looks exactly
 * like the whole library; `Badge` draws nothing for a zero, which is the right answer.
 *
 * It rides the section rail from `sm` up. The rail is the one bar pinned at every scroll position,
 * where a floating button stands over whatever the page is showing — and a figure stating what the
 * page is over has to be legible from the library at the bottom of it, not only from the top.
 * Below `sm` the rail has no room for it and `PageChip` carries the badge instead, the figure
 * reading in the sheet's own footer.
 *
 * It toggles rather than opens: from `sm` up the drawer is `variant="persistent"`, which MUI never
 * calls `onClose` for, so a chip that only opened would leave the drawer's own Close row as the
 * single way out of it.
 */
export const FilterChip = ({ label, activeCount }: { label: string; activeCount: number }) => {
  const open = useFilterSheetOpen();

  return (
    <Badge
      badgeContent={activeCount}
      color="secondary"
    >
      <RailChip
        label={label}
        icon={<FilterAlt />}
        ariaLabel={activeCount > 0 ? `${label}, ${activeCount} filters active` : label}
        active={activeCount > 0}
        onClick={() => setFilterSheetOpen(!open)}
      />
    </Badge>
  );
};

/**
 * The phone's one handle on everything the page is drawn through: the measure, the years and the
 * filters, behind a single control in the rail reading the measure with the filter badge on it.
 *
 * The measure is the word on it because it is the setting a reader changes most, and because the
 * three cannot all stand in a 358px rail — the chips are what the rail is for. The population the
 * desktop's chip states is in the sheet's own footer instead, beside the Clear that answers it.
 *
 * The picker's face rather than a chip's, since what it opens is a surface holding a page's
 * settings: a pill is the shape the rail's navigation wears, and the sheet is not somewhere the
 * reader is going. It opens rather than toggling, the sheet being a modal one the backdrop, the ✕
 * and a swipe all close.
 */
export const PageChip = ({ measure, activeCount }: { measure: string; activeCount: number }) => {
  const open = useFilterSheetOpen();

  return (
    <Badge
      badgeContent={activeCount}
      color="secondary"
    >
      <PickerButton
        value={measure}
        // The word is the measure alone: a label beside it spends a fifth of the rail saying what
        // the sheet's own title says on opening.
        ariaLabel={activeCount > 0 ? `This page: ${measure}, ${activeCount} filters active` : `This page: ${measure}`}
        lit={activeCount > 0}
        open={open}
        onOpen={() => setFilterSheetOpen(true)}
      />
    </Badge>
  );
};

/** Where the drawer draws the years: below `md` alone, the rail holding them above it. */
const SCOPE_ROW_SX = { display: { xs: "flex", md: "none" } } as const;

/** A labelled row of the page-controls sheet: what the setting is, and the control that sets it. */
const SheetRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <Stack
    direction="row"
    sx={{ alignItems: "center", flexWrap: "wrap", gap: 1, paddingY: 0.5 }}
  >
    <Typography
      variant="caption"
      // A stated width rather than the word's own, so the controls beside three labels of
      // different lengths stand on one edge and read as a column of settings.
      sx={{ width: 64, flexShrink: 0, color: "text.secondary" }}
    >
      {label}
    </Typography>
    {children}
  </Stack>
);

/**
 * Everything the page is drawn through, on one surface — a bottom sheet on a phone, a drawer that
 * stays out of the page's way from `sm` up.
 *
 * Fully controlled: the surface knows nothing about filter state — a domain hands it how many
 * choices are in play, the population they leave, the reset action, and its own controls as slots.
 * Whether it is open lives in `filterSheet`, outside React, because its handles are the rail's own
 * chips and the rail is a sibling of this whole subtree.
 *
 * `measure` and `scope` are the page's two readings rather than filters, and they stand here only
 * where the rail has no room for them: the measure below `sm`, the scope below `md`. The rail
 * holds them at every other width, so each is drawn once and dispatches to the page state the
 * charts beside it read.
 *
 * `toggles` and `categories` are two slots rather than one `children`: the desktop drawer's
 * Clear/Close row sits between them in DOM order, and its `order: { xs: 1, md: 0 }` sends it to
 * the end of the small layout alone. One combined slot would push the row to the end at `md` too.
 */
export const FilterDrawer = ({
  activeCount,
  population,
  onReset,
  measure,
  scope,
  toggles,
  categories,
}: {
  activeCount: number;
  /** What the filters have left, worded: "309 shows". The sheet states it where no rail chip does. */
  population: string;
  onReset: () => void;
  measure?: ReactNode;
  scope?: ReactNode;
  toggles?: ReactNode;
  categories: ReactNode;
}) => {
  // The one width question this shell asks, through the app's single answer to it: a sheet and a
  // persistent drawer are different trees, not one tree at two sizes.
  const sheet = usePhone();
  const drawerOpen = useFilterSheetOpen();
  const close = () => setFilterSheetOpen(false);
  const open = () => setFilterSheetOpen(true);

  // A tab change unmounts this while the chip that opened it goes with the page. The backdrop
  // makes that hard to reach, but the flag outlives the drawer either way and a fresh tab has no
  // business opening with a sheet up.
  useEffect(() => () => setFilterSheetOpen(false), []);

  if (sheet) {
    return (
      <SheetContext.Provider value={true}>
        <SwipeableDrawer
          anchor="bottom"
          open={drawerOpen}
          onOpen={open}
          onClose={close}
          // The bottom edge of a phone is the home gesture's, so the sheet is opened by its chip
          // and by nothing else; discovery would peek it into view on that same edge.
          disableSwipeToOpen
          disableDiscovery
          slotProps={{
            paper: {
              sx: {
                borderTopLeftRadius: (theme) => theme.shape.borderRadius,
                borderTopRightRadius: (theme) => theme.shape.borderRadius,
                // The five selects on the Games tab are taller than a phone: the sheet stops short
                // of the screen and scrolls its own middle, so the footer stating what is left is
                // always the last thing above the safe area rather than the first thing off the
                // bottom.
                maxHeight: "90vh",
              },
            },
          }}
        >
          {/* The bar every layer wears, with the grabber this one can be dragged away by. It takes
              the row alone rather than the pinned recipe: a sheet on the bottom edge stands under
              no notch, and the drawer's own paper is the ground beneath it. */}
          <SheetBar
            title="This page"
            grabber
            onClose={close}
            sx={sheetBarRow}
          />
          <Box sx={{ flex: 1, overflowY: "auto", paddingX: 2, paddingBottom: 1 }}>
            {/* The two readings the page counts by, above the filters and ruled off from them:
                they change what the figures mean, where a filter changes which rows there are. */}
            {measure && <SheetRow label="Count in">{measure}</SheetRow>}
            {scope && <SheetRow label="Years">{scope}</SheetRow>}
            {(measure || scope) && <Divider sx={{ marginY: 1 }} />}
            {toggles && (
              <SheetRow label="Filters">
                {/* The chips take the column beside the label and wrap inside it: at their own
                    width Games' three want 450px of the 286 there, and a box that cannot shrink
                    wraps whole, leaving the word alone on its line and the chips over the edge. */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, flex: 1, minWidth: 0 }}>{toggles}</Box>
              </SheetRow>
            )}
            <Grid
              container
              spacing={2}
              sx={{ paddingTop: 1 }}
            >
              {categories}
            </Grid>
          </Box>
          <Stack
            direction="row"
            sx={{
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              paddingLeft: 2,
              paddingRight: 1,
              paddingTop: 1,
              paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            {/* What the settings above have left, which the rail's chip states at every other
                width: the figure and the control that moved it belong on one surface, and the
                Clear beside it is what undoes the difference. */}
            <Typography
              variant="caption"
              sx={{ color: "text.secondary" }}
            >
              {narrowedTo(population, activeCount)}
            </Typography>
            <Button
              size="small"
              onClick={onReset}
            >
              Clear
            </Button>
          </Stack>
        </SwipeableDrawer>
      </SheetContext.Provider>
    );
  }

  return (
    <Drawer
      anchor="bottom"
      open={drawerOpen}
      variant="persistent"
      onClose={close}
    >
      <Grid
        container
        spacing={1}
        sx={{
          margin: 2,
          justifyContent: "space-between",
        }}
      >
        {/* A tablet's rail has no room for the years (`SectionRail`), so the drawer carries them —
            hidden rather than unmounted from `md`, where the rail draws its own and this one would
            be a second copy of a control the reader can see one of. */}
        {scope && (
          <Grid
            size={12}
            sx={SCOPE_ROW_SX}
          >
            <SheetRow label="Years">{scope}</SheetRow>
          </Grid>
        )}
        {toggles}
        <Grid
          size={{ xs: 12, md: "grow" }}
          sx={{
            display: "flex",
            justifyContent: { xs: "center", md: "end" },
            order: { xs: 1, md: 0 },
          }}
        >
          <Button onClick={onReset}>Clear</Button>
          <Button onClick={close}>Close</Button>
        </Grid>
        {categories}
      </Grid>
    </Drawer>
  );
};

/**
 * One boolean filter: a switch under its label where there is room for a grid of them, a chip in
 * the sheet.
 *
 * A chip states the same thing in a third of the height and reads as on or off by being filled —
 * a switch under a wrapped label takes three of them across a phone and puts the drawer's own
 * controls below the fold before a single category has been offered.
 */
export const FilterToggle = ({
  label,
  icon: Icon,
  checked,
  onChange,
}: {
  label: string;
  icon: SvgIconComponent;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => {
  const sheet = useContext(SheetContext);

  if (sheet) {
    return (
      <Chip
        icon={<Icon />}
        label={label}
        color={checked ? "primary" : "default"}
        variant={checked ? "filled" : "outlined"}
        onClick={() => onChange(!checked)}
      />
    );
  }

  return (
    <Grid
      size={{
        xs: 4,
        md: 2,
      }}
    >
      <FormControlLabel
        control={
          <Switch
            checked={checked}
            onChange={(_, value) => onChange(value)}
          />
        }
        label={
          <Typography>
            <Icon sx={{ verticalAlign: "middle" }} /> {label}
          </Typography>
        }
        labelPlacement="top"
      />
    </Grid>
  );
};

/**
 * One multi-select over a category's values, with an inline clear once anything is selected.
 *
 * `colourFor` tints the selected chips where the category has a colour vocabulary; a category
 * without one omits it and gets plain chips.
 */
export const FilterCategory = ({
  label,
  options,
  selected,
  onChange,
  colourFor,
}: {
  label: string;
  options: readonly string[];
  selected: readonly string[];
  onChange: (values: string[]) => void;
  colourFor?: (value: string) => Colour | undefined;
}) => (
  <Grid
    size={{
      xs: 12,
      md: 6,
    }}
  >
    <Stack direction="row">
      <FormControl fullWidth>
        <InputLabel sx={{ textTransform: "capitalize" }}>{label}</InputLabel>
        <Select
          value={selected}
          label={label}
          multiple
          renderValue={(values) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {values.map((value) => {
                const colour = colourFor?.(value);
                return (
                  <Chip
                    size="small"
                    key={value}
                    label={value}
                    sx={{
                      backgroundColor: colour,
                      color: colour && ((theme) => theme.palette.getContrastText(colour)),
                    }}
                  />
                );
              })}
            </Box>
          )}
          onChange={(event) => onChange(toValueArray(event.target.value))}
        >
          {options.map((option) => (
            <MenuItem
              key={option}
              value={option}
            >
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {selected.length > 0 && (
        <ToggleButton
          value="clear"
          onChange={() => onChange([])}
        >
          <Clear />
        </ToggleButton>
      )}
    </Stack>
  </Grid>
);
