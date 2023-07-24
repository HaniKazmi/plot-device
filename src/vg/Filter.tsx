import { FilterAlt, AllInclusive, QuestionMark, CatchingPokemon, Timer, Functions } from "@mui/icons-material";
import { SpeedDial, SpeedDialIcon, SpeedDialAction, Stack, Fab } from "@mui/material";
import { useEffect, useState } from "react";
import { Measure, VideoGame } from "./types";
import { Predicate } from "../utils/types";

const Filter = ({
  setFilterFunc,
  measure,
  setMeasure,
}: {
  setFilterFunc: (func: () => Predicate<VideoGame>) => void;
  measure: Measure;
  setMeasure: (measure: Measure) => void;
}) => {
  const [filterEndless, setFilterEndless] = useState(false);
  const [filterPokemon, setFilterPokemon] = useState(false);
  const [filterUnconfirmed, setFilterUnconfirmed] = useState(false);

  const updateFilter = ({ endless = filterEndless, pokemon = filterPokemon, unconfirmed = filterUnconfirmed }
    : { endless?: boolean, pokemon?: boolean, unconfirmed?: boolean }) => () => {
      const filters = [
        endless ? ({ status }: VideoGame) => status !== "Endless" : null,
        pokemon ? ({ franchise }: VideoGame) => franchise !== "Pokémon" : null,
        unconfirmed
          ? ({ platform, startDate }: VideoGame) => {
            if (platform === "PC") {
              if (!startDate?.getFullYear() || startDate?.getFullYear() < 2015) return false;
            } else if (
              platform !== "Nintendo Switch" &&
              platform !== "Nintendo 3DS" &&
              platform !== "PlayStation 4" &&
              platform !== "PlayStation 5"
            )
              return false;

            return true;
          }
          : null,
      ];

      setFilterEndless(endless);
      setFilterPokemon(pokemon);
      setFilterUnconfirmed(unconfirmed)
      if (endless !== filterEndless || pokemon !== filterPokemon || unconfirmed !== filterUnconfirmed) {
        setFilterFunc(() => (vgData: VideoGame) => filters.filter((f): f is Exclude<typeof f, null> => Boolean(f)).reduce((p, c) => p && c(vgData), true));
      }
    };

  useEffect(() => updateFilter({})(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const fabProps = (enabled: boolean) =>
    enabled ? { sx: { backgroundColor: "primary.light", "&:hover": { backgroundColor: "primary.dark" } } } : {};

  return (
    <Stack
      direction="column"
      spacing={2}
      sx={{ position: "fixed", right: (theme) => theme.spacing(2), bottom: (theme) => theme.spacing(2) }}
    >
      <SpeedDial icon={<SpeedDialIcon icon={<FilterAlt />} />} ariaLabel="add">
        <SpeedDialAction
          FabProps={fabProps(filterEndless)}
          tooltipOpen
          tooltipTitle="Endless"
          icon={<AllInclusive />}
          onClick={updateFilter({ endless: !filterEndless })}
        />
        <SpeedDialAction
          FabProps={fabProps(filterUnconfirmed)}
          tooltipOpen
          tooltipTitle="Unconfirmed"
          icon={<QuestionMark />}
          onClick={updateFilter({ unconfirmed: !filterUnconfirmed })}
        />
        <SpeedDialAction
          FabProps={fabProps(filterPokemon)}
          tooltipOpen
          tooltipTitle="Pokemon"
          icon={<CatchingPokemon />}
          onClick={updateFilter({ pokemon: !filterPokemon })}
        />
      </SpeedDial>
      <Fab color="secondary" onClick={() => setMeasure(measure === "Count" ? "Hours" : "Count")}>
        {measure === "Count" ? <Functions /> : <Timer />}
      </Fab>
    </Stack>
  );
};

export default Filter;
