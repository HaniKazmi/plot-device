import { Card, CardContent } from "@mui/material";
import { Holiday } from "./types";
import Chart from "react-google-charts";

const HolidayMap = ({ data }: { data: Holiday[] }) => {
    const tableHeader = [["Country"]];
    return (
        <Card>
            <CardContent>
                <Chart
                    chartType="GeoChart"
                    width="100%"
                    height="100vh"
                    data={[...tableHeader, ...data.map(d => [d.country])]}
                />
            </CardContent>
        </Card>
    )
}

export default HolidayMap;