import { Card, CardHeader, CardContent, CardMedia } from "@mui/material";
import Grid from '@mui/material/Unstable_Grid2';

const Finished = ({ data, width }: { data: { banner?: string, startDate?: Date, name: string }[], width: number }) => {
    const recent = data.filter(show => show.banner).sortByKey('startDate');

    return (
        <Card>
            <CardHeader title="All Shows" />
            <CardContent>
                <Grid container spacing={1} alignItems="center">
                    {recent.map(item => (
                        <Grid alignSelf="stretch" key={item.name} xs={width}>
                            <Card sx={{ height: "100%" }}>
                                <CardMedia component="img" src={item.banner} height="100%" loading="lazy" />
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    );
}

export default Finished;