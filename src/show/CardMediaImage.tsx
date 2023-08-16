import { Box, Card, CardContent, Stack } from "@mui/material";
import { CardMediaImage, DetailCard, TypedCardMediaImage } from "../common/Card";
import { Season, Show, isShow } from "./types";
import Grid from "@mui/material/Unstable_Grid2/Grid2";
import { statusToColour } from "../vg/types";
import { CURRENT_DATE, dateDiffInDays } from "../utils/dateUtils";

const ShowCardMediaImage = <T extends Show | Season>({ item, ...props }: Parameters<TypedCardMediaImage<T>>[0]) => {
    const show = isShow(item) ? item : item.show
    return (
        <CardMediaImage
            alt={show.name}
            image={show.banner}
            detailComponent={(colour) => <CardContent sx={{ background: colour, color: (theme) => colour && theme.palette.getContrastText(colour) }}>
                <Grid container spacing={1}>
                    <TimelineCard colour={colour} item={show} />
                    <DetailCard colour={colour} label="Start Date" value={show.startDate.toLocaleDateString()} />
                    <DetailCard colour={colour} label="End Date" value={show.endDate?.toLocaleDateString()} />
                    <DetailCard colour={statusToColour(show)} label="Status" value={show.status} />
                    <DetailCard colour={colour} label="Last Watched" value={`S${show.s.length}E${show.s.at(-1)!.e}`} />
                    <DetailCard colour={colour} label="Hours" value={Math.floor(show.minutes / 60)} />
                    <DetailCard colour={colour} label="Episodes" value={show.e} />
                </Grid>
            </CardContent>}
            {...props} />
    );
}

const startYear = new Date(2008, 0, 1);
const days = dateDiffInDays(startYear, CURRENT_DATE)!;

const TimelineCard = ({ colour, item }: { colour?: string, item: Show }) => {
    if (!item.startDate || item.startDate < startYear) return null;

    let startDate = startYear
    let oddSeason = true;
    let key = 0;
    const boxes = item.s.flatMap(season => {
        const temp = [];

        if (startDate < season.startDate) {
            const daysToSeasonStart = dateDiffInDays(startDate, season.startDate)!;
            const percentToSeasonStart = daysToSeasonStart / days * 100;
            temp.push(
                <Box key={key++} sx={{ width: percentToSeasonStart + "%" }} >
                    <Box sx={{ height: theme => theme.spacing(1), bgcolor: "grey", opacity: 0.8 }} />
                </Box>
            )
        }

        const endDate = season.endDate || CURRENT_DATE
        const seasonLengthPercent = Math.max((dateDiffInDays(season.startDate, endDate)!) / days * 100, 0.5);
        temp.push(
            <Box key={key++} sx={{ width: seasonLengthPercent + "%" }} >
                <Box sx={{ height: theme => theme.spacing(2), bgcolor: oddSeason ? "secondary.main" : "primary.main" }} />
            </Box>
        )

        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() + 1)
        oddSeason = !oddSeason;
        return temp;
    })

    if (startDate <= CURRENT_DATE) {
        const daysToEnd = dateDiffInDays(startDate, CURRENT_DATE)!;
        const percentToEnd = daysToEnd / days * 100;
        boxes.push(
            <Box key={key++} sx={{ width: percentToEnd + "%" }} >
                <Box sx={{ height: theme => theme.spacing(1), bgcolor: "grey", opacity: 0.8 }} />
            </Box>,
        )
    }

    return <Grid xs={12}>
        <Card sx={{ height: "100%", background: colour, color: (theme) => colour && theme.palette.getContrastText(colour) }}>
            <CardContent sx={{
                ":last-child": { paddingBottom: 2 },
                height: "100%"
            }}>
                <Stack direction="row" alignItems="center">
                    {boxes}
                </Stack>
            </CardContent>
        </Card>
    </Grid>
}


export default ShowCardMediaImage

