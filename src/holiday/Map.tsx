import { Card, CardContent } from "@mui/material";
import { Holiday } from "./types";

const HolidayMap = ({ data }: { data: Holiday[] }) => {
  return (
    <Card>
      <CardContent>{data.toString()}</CardContent>
    </Card>
  );
};

export default HolidayMap;
