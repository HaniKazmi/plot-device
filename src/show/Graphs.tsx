import Finished from "../common/Finished";
import Barchart from "./Barchart";
import Stats from "./Stats";
import Timeline from "./Timeline";
import { Show } from "./types";

const Graphs = ({ data }: { data: Show[] }) => (
  <>
    <Stats data={data} />
    <Timeline data={data} />
    <Barchart data={data} measure={"Hours"} />
    <Finished title="All Shows" data={data} width={3} />
  </>
);

export default Graphs;
