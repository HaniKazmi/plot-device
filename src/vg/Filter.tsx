import {
  AllInclusive,
  CatchingPokemon,
  Clear,
  FilterAlt,
  Functions,
  MoreHoriz,
  QuestionMark,
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
import { useEffect, useMemo, useReducer, useState } from "react";
import { Measure, platformToColor, VideoGame } from "./types";
import { Predicate } from "../utils/types";
import Grid from "@mui/material/Unstable_Grid2";

interface FilterState {
  endless: boolean;
  pokemon: boolean;
  unconfirmed: boolean;
  franchise: string[];
  platform: string[];
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
      newState.filter = filters(newState)
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
          <Grid xs={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={state.endless}
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
          <Grid xs={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={state.unconfirmed}
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
          <Grid xs={2}>
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
          <Grid xs={6} display="flex" justifyContent="end">
            <Button onClick={() => dispatch({ type: "resetFilters" })}>Reset Filters</Button>
          </Grid>
          <Grid xs={6}>
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
          <Grid xs>
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
        </Grid>
      </Drawer>
    </Stack>
  );
};

const fabProps = (enabled: boolean) =>
  enabled ? { sx: { backgroundColor: "primary.light", "&:hover": { backgroundColor: "primary.dark" } } } : {};

export default Filter;
