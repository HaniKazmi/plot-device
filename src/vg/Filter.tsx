import {
  AllInclusive,
  CatchingPokemonTwoTone,
  Clear,
  FilterAlt,
  Functions,
  QuestionMark,
  Timer,
  type SvgIconComponent,
} from "@mui/icons-material";
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
import { useState } from "react";
import { platformToColor, VideoGame, type VideoGameStringKeys } from "./types";
import Grid from "@mui/material/Grid";
import { FilterDispatch, FilterState } from "./filterUtils";
import type { Colour, KeysMatching } from "../utils/types";

const Filter = ({ state, dispatch, data }: { state: FilterState; dispatch: FilterDispatch; data: VideoGame[] }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Stack
      direction="column"
      spacing={2}
      sx={{ position: "fixed", right: (theme) => theme.spacing(2), bottom: (theme) => theme.spacing(2) }}
    >
      <Fab
        color="secondary"
        onClick={() => dispatch({ type: "toggleMeasure" })}
      >
        {state.measure === "Games" ? <Functions /> : <Timer />}
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
          margin={2}
          spacing={1}
          justifyContent="space-between"
        >
          <FilterToggle
            toggle="endless"
            Icon={AllInclusive}
            dispatch={dispatch}
            state={state}
          />
          <FilterToggle
            toggle="unconfirmed"
            Icon={QuestionMark}
            dispatch={dispatch}
            state={state}
          />
          <FilterToggle
            toggle="pokemon"
            Icon={CatchingPokemonTwoTone}
            dispatch={dispatch}
            state={state}
          />
          <FilterReset
            dispatch={dispatch}
            setDrawerOpen={setDrawerOpen}
          />
          <FilterCategory
            category="platform"
            data={data}
            state={state}
            dispatch={dispatch}
            colourFunc={platformToColor}
          />
          <FilterCategory
            category="genre"
            data={data}
            state={state}
            dispatch={dispatch}
          />
          <FilterCategory
            category="publisher"
            data={data}
            state={state}
            dispatch={dispatch}
          />
          <FilterCategory
            category="franchise"
            data={data}
            state={state}
            dispatch={dispatch}
          />
        </Grid>
      </Drawer>
    </Stack>
  );
};

const FilterCategory = <T extends VideoGameStringKeys & keyof FilterState>({
  data,
  category,
  colourFunc,
  state,
  dispatch,
}: {
  data: VideoGame[];
  category: T;
  colourFunc?: (platform: VideoGame[T]) => Colour;
  state: FilterState;
  dispatch: FilterDispatch;
}) => {
  const options = [...new Set(data.map((vg) => vg[category]))].toSorted();

  return (
    <Grid
      size={{
        xs: 12,
        md: 6,
      }}
    >
      <Stack direction="row">
        <FormControl fullWidth>
          <InputLabel sx={{ textTransform: "capitalize" }}>{category}</InputLabel>
          <Select
            value={state[category]}
            label={category}
            multiple
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {selected.map((value) => {
                  const colour = colourFunc?.(value as VideoGame[T]);
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
            onChange={(event) => {
              const value = Array.isArray(event.target.value) ? event.target.value : event.target.value.split(",");
              dispatch({ type: "updateFilter", filter: category, value });
            }}
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
        {state.publisher.length > 0 && (
          <ToggleButton
            value="clear"
            onChange={() => {
              dispatch({ type: "updateFilter", filter: category, value: [] });
            }}
          >
            <Clear />
          </ToggleButton>
        )}
      </Stack>
    </Grid>
  );
};

interface FilterDispatchProp {
  dispatch: FilterDispatch;
}

const FilterReset = ({ dispatch, setDrawerOpen }: FilterDispatchProp & { setDrawerOpen: (b: boolean) => void }) => (
  <Grid
    display={{ xs: "flex" }}
    justifyContent={{ xs: "center", md: "end" }}
    size={{ xs: 12, md: "grow" }}
    order={{ xs: 1, md: 0 }}
  >
    <Button onClick={() => dispatch({ type: "resetFilters" })}>Clear</Button>
    <Button onClick={() => setDrawerOpen(false)}>Close</Button>
  </Grid>
);

const FilterToggle = ({
  state,
  dispatch,
  toggle,
  Icon,
}: FilterDispatchProp & { toggle: KeysMatching<FilterState, boolean>; state: FilterState; Icon: SvgIconComponent }) => (
  <Grid
    size={{
      xs: 4,
      md: 2,
    }}
  >
    <FormControlLabel
      control={
        <Switch
          checked={state[toggle]}
          onChange={(_, checked) => dispatch({ type: "updateFilter", filter: toggle, value: checked })}
        />
      }
      label={
        <Typography textTransform="capitalize">
          <Icon sx={{ verticalAlign: "middle" }} /> {toggle}
        </Typography>
      }
      labelPlacement="top"
    />
  </Grid>
);

export default Filter;
