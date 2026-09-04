import { Clear, FilterAlt, type SvgIconComponent } from "@mui/icons-material";
import {
  Badge,
  Box,
  Button,
  Chip,
  Drawer,
  Fab,
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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Colour } from "../utils/types";
import { toValueArray } from "./filterOptions";
import { setFilterSheetOpen, useFilterSheetOpen } from "./filterSheet";
import { RailChip } from "./ChipRail";

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
 * The control that opens the filters on a phone, for the section rail's trailing slot.
 *
 * A chip rather than the floating button: the rail is the one bar pinned at every scroll position,
 * where a FAB stands over whatever the page is showing and, at the bottom right of a phone, under
 * the browser's own toolbar. Icon and no word, since the rail's remaining width is the section
 * chips' — the theme drops an empty chip label's padding for exactly this.
 *
 * Drawn only below `sm`, where the FAB is not; from there up the two would be one control offered
 * twice.
 */
export const FilterChip = ({ activeCount }: { activeCount: number }) => (
  <Box sx={{ display: { xs: "flex", sm: "none" } }}>
    <Badge
      badgeContent={activeCount}
      color="secondary"
    >
      <RailChip
        label=""
        icon={<FilterAlt />}
        ariaLabel={activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"}
        active={activeCount > 0}
        onClick={() => setFilterSheetOpen(true)}
      />
    </Badge>
  </Box>
);

/**
 * The button and the drawer every tab's filter is built from — a floating button over a drawer
 * that stays out of the page's way from `sm` up, a modal bottom sheet below it.
 *
 * Fully controlled: the drawer knows nothing about filter state — a domain hands it how many
 * choices are in play, the reset action, and its own toggles and category selects as children.
 * Whether it is open lives in `filterSheet`, outside React, because the phone's own handle is the
 * rail chip and the rail is a sibling of this whole subtree.
 *
 * The badge is the closed drawer's only account of itself. Every chart on the page is drawn
 * through these controls, so a library narrowed to one franchise otherwise looks exactly like the
 * whole library — the count says something is being hidden and roughly how much. `Badge` draws
 * nothing for a zero of its own accord, which is the right answer: an unfiltered page has no
 * business carrying a mark saying so.
 *
 * `toggles` and `categories` are two slots rather than one `children`: the Clear/Close row sits
 * between them in DOM order, and its `order: { xs: 1, md: 0 }` sends it to the end of the small
 * layout alone. One combined slot would push the row to the end at `md` too.
 */
export const FilterDrawer = ({
  activeCount,
  onReset,
  toggles,
  categories,
}: {
  activeCount: number;
  onReset: () => void;
  toggles?: ReactNode;
  categories: ReactNode;
}) => {
  const theme = useTheme();
  const sheet = useMediaQuery(theme.breakpoints.down("sm"));
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
                // of the screen and scrolls its own middle, so the Clear/Done row is always the
                // last thing above the safe area rather than the first thing off the bottom.
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
              },
            },
          }}
        >
          <Box
            sx={{
              flexShrink: 0,
              width: 32,
              height: 4,
              borderRadius: 2,
              backgroundColor: "divider",
              marginX: "auto",
              marginTop: 1,
            }}
          />
          <Stack
            direction="row"
            sx={{ flexShrink: 0, alignItems: "baseline", justifyContent: "space-between", paddingX: 2, paddingY: 1 }}
          >
            <Typography variant="h6">Filters</Typography>
            <Typography
              variant="caption"
              color="text.secondary"
            >
              {activeCount > 0 ? `${activeCount} active` : "None active"}
            </Typography>
          </Stack>
          <Box sx={{ flex: 1, overflowY: "auto", paddingX: 2, paddingBottom: 1 }}>
            {toggles && <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, paddingBottom: 2 }}>{toggles}</Box>}
            <Grid
              container
              spacing={2}
            >
              {categories}
            </Grid>
          </Box>
          <Stack
            direction="row"
            sx={{
              flexShrink: 0,
              justifyContent: "space-between",
              gap: 1,
              paddingX: 2,
              paddingTop: 1,
              paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <Button onClick={onReset}>Clear</Button>
            <Button
              variant="contained"
              onClick={close}
            >
              Done
            </Button>
          </Stack>
        </SwipeableDrawer>
      </SheetContext.Provider>
    );
  }

  return (
    <Box sx={{ position: "fixed", right: (theme) => theme.spacing(2), bottom: (theme) => theme.spacing(2) }}>
      <Badge
        badgeContent={activeCount}
        color="secondary"
      >
        <Fab
          color="primary"
          aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"}
          onClick={() => setFilterSheetOpen(!drawerOpen)}
        >
          <FilterAlt />
        </Fab>
      </Badge>
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
          {toggles}
          <Grid
            size={{ xs: 12, md: "grow" }}
            sx={{
              display: { xs: "flex" },
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
    </Box>
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
