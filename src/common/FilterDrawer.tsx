import { Clear, FilterAlt, type SvgIconComponent } from "@mui/icons-material";
import {
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
  Switch,
  ToggleButton,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { useState, type ReactNode } from "react";
import type { Colour } from "../utils/types";
import { toValueArray } from "./filterOptions";

/**
 * The pair of floating buttons and the bottom drawer every tab's filter is built from.
 *
 * Fully controlled: the drawer knows nothing about filter state — a domain hands it the measure
 * icon, the reset action, and its own toggles and category selects as children. Only the drawer's
 * open state lives here, because the Close button needs it and nothing outside does.
 *
 * `toggles` and `categories` are two slots rather than one `children`: the Clear/Close row sits
 * between them in DOM order, and its `order: { xs: 1, md: 0 }` sends it to the end of the small
 * layout only. One combined slot would push the row to the end at `md` too.
 */
export const FilterDrawer = ({
  measureIcon,
  onToggleMeasure,
  onReset,
  toggles,
  categories,
}: {
  measureIcon: ReactNode;
  onToggleMeasure: () => void;
  onReset: () => void;
  toggles?: ReactNode;
  categories: ReactNode;
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Stack
      direction="column"
      spacing={2}
      sx={{ position: "fixed", right: (theme) => theme.spacing(2), bottom: (theme) => theme.spacing(2) }}
    >
      <Fab
        color="secondary"
        onClick={onToggleMeasure}
      >
        {measureIcon}
      </Fab>
      <Fab
        color="primary"
        onClick={() => setDrawerOpen(!drawerOpen)}
      >
        <FilterAlt />
      </Fab>
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        variant="persistent"
        onClose={() => setDrawerOpen(false)}
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
            <Button onClick={() => setDrawerOpen(false)}>Close</Button>
          </Grid>
          {categories}
        </Grid>
      </Drawer>
    </Stack>
  );
};

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
}) => (
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
        <Typography
          sx={{
            textTransform: "capitalize",
          }}
        >
          <Icon sx={{ verticalAlign: "middle" }} /> {label}
        </Typography>
      }
      labelPlacement="top"
    />
  </Grid>
);

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
