import { Box, Card, CardContent, Stack } from "@mui/material";
import { CardMediaImage, DetailCard, TypedCardMediaImage } from "../common/Card";
import { VideoGame, companyToColor, ratingToColour, statusToColour } from "./types";
import Grid from "@mui/material/Unstable_Grid2/Grid2";
import { CURRENT_DATE, dateDiffInDays } from "../utils/dateUtils";

const VgCardMediaImage: TypedCardMediaImage<VideoGame> = ({ item, ...props }) => (
    <CardMediaImage
        alt={item.name}
        image={item.banner}
        detailComponent={(colour) => <CardContent sx={{ background: colour, color: (theme) => colour && theme.palette.getContrastText(colour) }}>
            <Grid container spacing={1}>
                <TimelineCard colour={colour} item={item} />
                <DetailCard colour={colour} label="Start Date" value={item.exactDate ? item.startDate.toLocaleDateString() : item.startDate?.getFullYear()} />
                <DetailCard colour={colour} label="End Date" value={item.exactDate ? item.endDate?.toLocaleDateString() : item.endDate?.getFullYear()} />
                <DetailCard colour={colour} label="Days To Beat" value={item.exactDate ? item.numDays : undefined} />
                <DetailCard colour={colour} label="Hours" value={item.hours} />

                <DetailCard colour={statusToColour(item)} label="Status" value={item.status} />
                <DetailCard colour={companyToColor(item)} label="Platform" value={item.platform} />
                <DetailCard colour={colour} label="Release Date" value={item.releaseDate.toLocaleDateString()} />
                <DetailCard colour={colour} label="Format" value={item.format} />

                <DetailCard colour={colour} label="Developer" value={item.developer} />
                <DetailCard colour={colour} label="Publisher" value={item.publisher} />
                <DetailCard colour={colour} label="Franchise" value={item.franchise} />
                <DetailCard colour={ratingToColour(item)} label="PEGI" value={item.rating} />

                <DetailCard colour={colour} label="Genre" value={item.genre} />
                <DetailCard large colour={colour} label="Themes" value={item.theme.join(" - ")} />

            </Grid>
        </CardContent>}
        {...props} />
)

const startYear = new Date(2004, 0, 1);
const days = dateDiffInDays(startYear, CURRENT_DATE)!;

const TimelineCard = ({ colour, item }: { colour?: string, item: VideoGame }) => {
    if (!item.startDate || item.startDate < startYear) return null;
    const endDate = item.endDate ? (item.exactDate ? item.endDate : new Date(item.startDate.getFullYear(), item.startDate.getMonth() + 1, item.startDate.getDay())) : CURRENT_DATE;
    const startDays = dateDiffInDays(startYear, item.startDate)!
    const startPercent = startDays / days * 100;
    const gameLengthPercent = Math.max((item.numDays || dateDiffInDays(item.startDate, endDate)!) / days * 100, 0.5);
    const endPercent = 100 - gameLengthPercent - startPercent;

    return <Grid xs={12}>
        <Card sx={{ height: "100%", background: colour, color: (theme) => colour && theme.palette.getContrastText(colour) }}>
            <CardContent sx={{
                ":last-child": { paddingBottom: 2 },
                height: "100%"
            }}>
                <Stack direction="row" alignItems="center">
                    <Box sx={{ width: startPercent + "%" }} >
                        <Box sx={{ height: "10px", bgcolor: "primary.light", opacity: 0.8 }} />
                    </Box>
                    <Box sx={{ width: gameLengthPercent + "%" }} >
                        <Box sx={{ height: "15px", bgcolor: "secondary.dark" }} />
                    </Box>
                    <Box sx={{ width: endPercent + "%" }} >
                        <Box sx={{ height: "10px", bgcolor: "primary.light", opacity: 0.8 }} />
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    </Grid>
}

export default VgCardMediaImage
