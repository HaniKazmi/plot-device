import Stats from "./Stats";
import { Measure, VideoGame } from "./types";
import Sunburst from "./Sunburst";
import Barchart from "./Barchart";
import Finished from "../common/Finished";
import Timeline from "./Timeline";

const Graphs = ({ vgData, measure }: { vgData: VideoGame[]; measure: Measure }) => (
  <>
    <Stats data={vgData} />
    <Timeline data={vgData} />
    <Sunburst data={vgData} measure={measure} />
    <Barchart data={vgData} measure={measure} />
    <Finished title="All Games" data={vgData} width={4} />
  </>
);

export default Graphs;
