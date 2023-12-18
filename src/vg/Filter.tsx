import {
  AllInclusive,
  CatchingPokemon,
  Clear,
  FilterAlt,
  Functions,
  MoreHoriz,
  QuestionMark,
  SvgIconComponent,
  Timer,
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
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Stack,
  Switch,
  ToggleButton,
  Typography,
} from "@mui/material";
import { Dispatch, useEffect, useMemo, useReducer, useState } from "react";
import { Measure, platformToColor, VideoGame } from "./types";
import { Predicate } from "../utils/types";
import Grid from "@mui/material/Unstable_Grid2";

interface FilterState {
  endless: boolean;
  pokemon: boolean;
  unconfirmed: boolean;
  franchise: string[];
  platform: string[];
  genre: string[];
  filter: Predicate<VideoGame>;
}

type Action<K extends keyof FilterState> =
  | { type: "resetFilters" }
  | { type: "updateFilter"; filter: K; value: FilterState[K] };

const filters = (state: Omit<FilterState, "filter">) => (vg: VideoGame) =>
  [
    state.endless && (({ status }: VideoGame) => status !== "Endless"),
    state.pokemon && (({ franchise }: VideoGame) => franchise !== "Pokémon"),
    state.unconfirmed &&
      (({ platform, startDate }: VideoGame) => {
        if (platform === "PC") {
          if (!startDate?.getFullYear() || startDate.getFullYear() < 2015) return false;
        } else if (!["Nintendo Switch", "Nintendo 3DS", "PlayStation 4", "PlayStation 5"].includes(platform)) {
          return false;
        }

        return true;
      }),
    state.franchise.length > 0 && (({ franchise }: VideoGame) => state.franchise.includes(franchise)),
    state.platform.length > 0 && (({ platform }: VideoGame) => state.platform.includes(platform)),
    state.genre.length > 0 && (({ genre }: VideoGame) => state.genre.includes(genre)),
  ]
    .filter((f): f is Exclude<typeof f, false> => Boolean(f))
    .reduce((p, c) => p && c(vg), true);

const reducer = <K extends keyof FilterState>(state: FilterState, action: Action<K>): FilterState => {
  switch (action.type) {
    case "resetFilters":
      return initialState;
    case "updateFilter": {
      const newState = {
        ...state,
      };
      newState[action.filter] = action.value;
      newState.filter = filters(newState);
      return newState;
    }
  }
};

const initialState: FilterState = (() => {
  const state = {
    endless: false,
    pokemon: false,
    unconfirmed: false,
    franchise: [],
    platform: [],
    genre: [],
    filter: (vg: VideoGame) => Boolean(vg),
  };

  state.filter = filters(state);

  return state;
})();

const Filter = ({
  setFilterFunc,
  measure,
  setMeasure,
  data,
}: {
  setFilterFunc: (func: () => Predicate<VideoGame>) => void;
  measure: Measure;
  setMeasure: (measure: Measure) => void;
  data: VideoGame[];
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    setFilterFunc(() => state.filter);
  }, [state.filter, setFilterFunc]);

  const franchises = useMemo(() => [...new Set(data.map((vg) => vg.franchise))].sort(), [data]);
  const platforms = useMemo(() => [...new Set(data.map((vg) => vg.platform))].sort(), [data]);
  const genres = useMemo(() => [...new Set(data.map((vg) => vg.genre))].sort(), [data]);

  return (
    <Stack
      direction="column"
      spacing={2}
      sx={{ position: "fixed", right: (theme) => theme.spacing(2), bottom: (theme) => theme.spacing(2) }}
    >
      <SpeedDial icon={<SpeedDialIcon icon={<FilterAlt />} />} ariaLabel="add">
        <SpeedDialAction
          FabProps={fabProps(state.endless)}
          tooltipOpen
          tooltipTitle="Endless"
          icon={<AllInclusive />}
          onClick={() => dispatch({ type: "updateFilter", filter: "endless", value: !state.endless })}
        />
        <SpeedDialAction
          FabProps={fabProps(state.unconfirmed)}
          tooltipOpen
          tooltipTitle="Unconfirmed"
          icon={<QuestionMark />}
          onClick={() => dispatch({ type: "updateFilter", filter: "unconfirmed", value: !state.unconfirmed })}
        />
        <SpeedDialAction
          FabProps={fabProps(state.pokemon)}
          tooltipOpen
          tooltipTitle="Pokemon"
          icon={<CatchingPokemon />}
          onClick={() => dispatch({ type: "updateFilter", filter: "pokemon", value: !state.pokemon })}
        />
        <SpeedDialAction
          FabProps={fabProps(drawerOpen)}
          tooltipOpen
          tooltipTitle="More"
          icon={<MoreHoriz />}
          onClick={() => setDrawerOpen(!drawerOpen)}
        />
      </SpeedDial>
      <Fab color="secondary" onClick={() => setMeasure(measure === "Count" ? "Hours" : "Count")}>
        {measure === "Count" ? <Functions /> : <Timer />}
      </Fab>
      <Drawer anchor="bottom" open={drawerOpen} variant="temporary" onClose={() => setDrawerOpen(false)}>
        <Grid container margin={2} spacing={1} justifyContent="space-between">
          <FilterReset dispatch={dispatch} />
          <FilterEndless dispatch={dispatch} endless={state.endless} />
          <FilterUnconfirmed dispatch={dispatch} unconfirmed={state.unconfirmed} />
          <Grid xs={6} md={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={state.pokemon}
                  onChange={(_, checked) => dispatch({ type: "updateFilter", filter: "pokemon", value: checked })}
                />
              }
              label={
                <Typography>
                  <CatchingPokemon sx={{ verticalAlign: "middle" }} /> Pokemon
                </Typography>
              }
              labelPlacement="top"
            />
          </Grid>
          <Grid xs={6} display={{ xs: "none", md: "flex" }} justifyContent="end">
            <Button onClick={() => dispatch({ type: "resetFilters" })}>Reset Filters</Button>
          </Grid>
          <Grid xs={12} md={6}>
            <Stack direction="row">
              <FormControl fullWidth>
                <InputLabel>Franchise</InputLabel>
                <Select
                  value={state.franchise}
                  label="Franchise"
                  multiple
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip size="small" key={value} label={value} />
                      ))}
                    </Box>
                  )}
                  onChange={(event) => {
                    const value = Array.isArray(event.target.value)
                      ? event.target.value
                      : event.target.value.split(",");
                    dispatch({ type: "updateFilter", filter: "franchise", value });
                  }}
                >
                  {franchises.map((franchise) => (
                    <MenuItem key={franchise} value={franchise}>
                      {franchise}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {state.franchise.length > 0 && (
                <ToggleButton
                  value="clear"
                  onChange={() => {
                    dispatch({ type: "updateFilter", filter: "franchise", value: [] });
                  }}
                >
                  <Clear />
                </ToggleButton>
              )}
            </Stack>
          </Grid>
          <Grid xs={12} md={6}>
            <Stack direction="row">
              <FormControl fullWidth>
                <InputLabel>Platform</InputLabel>
                <Select
                  value={state.platform}
                  label="Platform"
                  multiple
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => {
                        const platformColor = platformToColor(value);
                        return (
                          <Chip
                            size="small"
                            key={value}
                            label={value}
                            sx={{
                              backgroundColor: platformColor,
                              color: (theme) => theme.palette.getContrastText(platformColor),
                            }}
                          />
                        );
                      })}
                    </Box>
                  )}
                  onChange={(event) => {
                    const value = Array.isArray(event.target.value)
                      ? event.target.value
                      : event.target.value.split(",");
                    dispatch({ type: "updateFilter", filter: "platform", value });
                  }}
                >
                  {platforms.map((platform) => (
                    <MenuItem key={platform} value={platform}>
                      {platform}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {state.platform.length > 0 && (
                <ToggleButton
                  value="clear"
                  onChange={() => {
                    dispatch({ type: "updateFilter", filter: "platform", value: [] });
                  }}
                >
                  <Clear />
                </ToggleButton>
              )}
            </Stack>
          </Grid>
          <Grid xs={12} md={6}>
            <Stack direction="row">
              <FormControl fullWidth>
                <InputLabel>Genre</InputLabel>
                <Select
                  value={state.genre}
                  label="Genre"
                  multiple
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => {
                        return <Chip size="small" key={value} label={value} />;
                      })}
                    </Box>
                  )}
                  onChange={(event) => {
                    const value = Array.isArray(event.target.value)
                      ? event.target.value
                      : event.target.value.split(",");
                    dispatch({ type: "updateFilter", filter: "genre", value });
                  }}
                >
                  {genres.map((genre) => (
                    <MenuItem key={genre} value={genre}>
                      {genre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {state.genre.length > 0 && (
                <ToggleButton
                  value="clear"
                  onChange={() => {
                    dispatch({ type: "updateFilter", filter: "genre", value: [] });
                  }}
                >
                  <Clear />
                </ToggleButton>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Drawer>
    </Stack>
  );
};

interface FilterDispatchProp {
  dispatch: Dispatch<Action<keyof FilterState>>;
}

const FilterReset = ({ dispatch }: FilterDispatchProp) => (
  <Grid xs={12} display={{ xs: "flex", md: "none" }} justifyContent="center">
    <Button onClick={() => dispatch({ type: "resetFilters" })}>Reset Filters</Button>
  </Grid>
);

const FilterBoolean = <K extends keyof FilterState>({
  label,
  dispatch,
  key,
  state,
  Icon,
}: FilterDispatchProp & { label: string; key: K; state: boolean; Icon: SvgIconComponent }) => (
  <Grid xs={6} md={2}>
    <FormControlLabel
      control={
        <Switch
          checked={state}
          onChange={(_, checked) => dispatch({ type: "updateFilter", filter: key, value: checked })}
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

const FilterEndless = ({ dispatch, endless }: FilterDispatchProp & Pick<FilterState, "endless">) => (
  <Grid xs={6} md={2}>
    <FormControlLabel
      control={
        <Switch
          checked={endless}
          onChange={(_, checked) => dispatch({ type: "updateFilter", filter: "endless", value: checked })}
        />
      }
      label={
        <Typography>
          <AllInclusive sx={{ verticalAlign: "middle" }} /> Endless
        </Typography>
      }
      labelPlacement="top"
    />
  </Grid>
);

const FilterUnconfirmed = ({ dispatch, unconfirmed }: FilterDispatchProp & Pick<FilterState, "unconfirmed">) => (
  <Grid xs={6} md={2}>
    <FormControlLabel
      control={
        <Switch
          checked={unconfirmed}
          onChange={(_, checked) => dispatch({ type: "updateFilter", filter: "unconfirmed", value: checked })}
        />
      }
      label={
        <Typography>
          <QuestionMark sx={{ verticalAlign: "middle" }} /> Unconfirmed
        </Typography>
      }
      labelPlacement="top"
    />
  </Grid>
);

const fabProps = (enabled: boolean) =>
  enabled ? { sx: { backgroundColor: "primary.light", "&:hover": { backgroundColor: "primary.dark" } } } : {};

export default Filter;
