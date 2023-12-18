import { Stack } from "@mui/material";
import { Holiday } from "./types";
import HolidayMap from "./Map";

const Graphs = ({ data }: { data: Holiday[] }) => (
    <Stack spacing={2}>
        <HolidayMap data={data} /> 
    </Stack>
  );
  
  export default Graphs;
  