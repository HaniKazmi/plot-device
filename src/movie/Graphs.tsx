import { memo } from "react";
import { Movie } from "./types";
import { Stack } from "@mui/material";
import Finished from "../common/Finished";
import MovieCardMediaImage from "./CardMediaImage";

const Graphs = memo(({ data }: { data: Movie[] }) => {
  return (
    <>
      <Stack spacing={2}>
        <Finished
          title="All Movies"
          data={data}
          width={3}
          MediaComponent={MovieCardMediaImage}
        />
      </Stack>
    </>
  );
});

export default Graphs;
