import {
  AllInclusive,
  CatchingPokemonTwoTone,
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
import { useMemo, useState } from "react";
import { platformToColor, VideoGame } from "./types";
import Grid from "@mui/material/Unstable_Grid2";
import { FilterDispatch, FilterState } from "./filterUtils";

const Filter = ({ state, dispatch, data }: { state: FilterState; dispatch: FilterDispatch; data: VideoGame[] }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

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
          icon={<CatchingPokemonTwoTone />}
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
      <Fab color="secondary" onClick={() => dispatch({ type: "toggleMeasure" })}>
        {state.measure === "Count" ? <Functions /> : <Timer />}
      </Fab>
      <Drawer anchor="bottom" open={drawerOpen} variant="persistent" onClose={() => setDrawerOpen(false)}>
        <Grid container margin={2} spacing={1} justifyContent="space-between">
          <FilterReset dispatch={dispatch} setDrawerOpen={setDrawerOpen} />
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
                  <CatchingPokemonTwoTone sx={{ verticalAlign: "middle" }} /> Pokemon
                </Typography>
              }
              labelPlacement="top"
            />
          </Grid>
          <Grid xs={6} display={{ xs: "none", md: "flex" }} justifyContent="end">
            <Button onClick={() => dispatch({ type: "resetFilters" })}>Reset Filters</Button>
            <Button onClick={() => setDrawerOpen(false)}>Close</Button>
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
  dispatch: FilterDispatch;
}

const FilterReset = ({ dispatch, setDrawerOpen }: FilterDispatchProp & { setDrawerOpen: (b: boolean) => void }) => (
  <Grid xs={12} display={{ xs: "flex", md: "none" }} justifyContent="center">
    <Button onClick={() => dispatch({ type: "resetFilters" })}>Reset Filters</Button>
    <Button onClick={() => setDrawerOpen(false)}>Close</Button>
  </Grid>
);

// const FilterBoolean = <K extends keyof FilterState>({
//   label,
//   dispatch,
//   key,
//   state,
//   Icon,
// }: FilterDispatchProp & { label: string; key: K; state: boolean; Icon: SvgIconComponent }) => (
//   <Grid xs={6} md={2}>
//     <FormControlLabel
//       control={
//         <Switch
//           checked={state}
//           onChange={(_, checked) => dispatch({ type: "updateFilter", filter: key, value: checked })}
//         />
//       }
//       label={
//         <Typography>
//           <Icon sx={{ verticalAlign: "middle" }} /> {label}
//         </Typography>
//       }
//       labelPlacement="top"
//     />
//   </Grid>
// );

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
