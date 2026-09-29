import { useState } from "react";
import { groupToColour, videoGameOptions, VideoGameStringKeys, type Measure, type VideoGame } from "./types";
import type { KeysMatching } from "../utils/types";
import Sunburst, { SunBurstControls } from "../common/Sunburst";
import { useScheme } from "../common/useScheme";
import { gameGroupValue } from "./statsData";

type OptionKeys = VideoGameStringKeys | KeysMatching<VideoGame, VideoGame["startDate"]> | "decade";
const options: OptionKeys[] = [...videoGameOptions, "startDate", "decade"];

const GameSunburst = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const scheme = useScheme();

  const [controlStates, setControlStates] = useState<OptionKeys[]>(["company", "platform", "franchise"]);

  return (
    <Sunburst
      title={`Where the ${measure.toLowerCase()} went`}
      data={data}
      groups={controlStates}
      options={{
        keyToVal: gameGroupValue,
        getCount: ({ hours }) => (measure === "Hours" ? hours : 1),
        getColor: (game, firstGroup) => groupToColour(firstGroup, game, scheme) || undefined,
        getLeafName: ({ name }) => name,
      }}
      controls={
        <SunBurstControls
          options={options}
          controlStates={controlStates}
          setControlStates={setControlStates}
        />
      }
    />
  );
};

export default GameSunburst;
