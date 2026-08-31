import { useState } from "react";
import { groupToColour, videoGameOptions, VideoGameStringKeys, type Measure, type VideoGame } from "./types";
import { releaseDecade } from "../utils/types";
import type { KeysMatching } from "../utils/types";
import { PlainDate } from "../common/date";
import Sunburst, { SunBurstControls } from "../common/Sunburst";
import { format } from "../utils/mathUtils";

type OptionKeys = VideoGameStringKeys | KeysMatching<VideoGame, VideoGame["startDate"]> | "decade";
const options: OptionKeys[] = [...videoGameOptions, "startDate", "decade"];

const VgSunburst = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const [controlStates, setControlStates] = useState<OptionKeys[]>(["company", "platform", "franchise"]);

  return (
    <Sunburst
      title={`Where the ${measure.toLowerCase()} went`}
      count={`${format(data.length)} games`}
      data={data}
      groups={controlStates}
      options={{
        keyToVal: (game, key) => {
          // Release decade is a derivation rather than a field — "how much of this is retro?"
          if (key === "decade") return releaseDecade(game.releaseDate.year);
          const val = game[key];
          return val instanceof PlainDate ? val.yearString() : String(val);
        },
        getCount: ({ hours }) => (measure === "Hours" ? hours : 1),
        getColor: (game, firstGroup) => groupToColour(firstGroup, game) || undefined,
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

export default VgSunburst;
