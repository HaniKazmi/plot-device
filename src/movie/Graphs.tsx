import { memo } from "react";
import { Movie } from "./types";
import Finished from "../common/Finished";
import MovieCardMediaImage from "./CardMediaImage";

const Graphs = memo(({ data }: { data: Movie[] }) => {
  return (
    <Finished
      title="All Movies"
      data={data}
      width={3}
      MediaComponent={MovieCardMediaImage}
    />
  );
});

export default Graphs;
