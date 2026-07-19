import { CardContent, Grid } from "@mui/material";
import { CardMediaImage, DetailCard, TypedCardMediaImage } from "../common/Card";
import { Movie } from "./types";

const MovieCardMediaImage: TypedCardMediaImage<Movie> = ({ item, ...props }) => (
  <CardMediaImage
    alt={item.name}
    image={item.banner}
    detailComponent={
      <CardContent>
        <Grid
          container
          spacing={1}
        >
          <DetailCard
            label="Watch Date"
            value={item.startDate.toString()}
          />
          <DetailCard
            label="Release Date"
            value={item.releaseDate.toString()}
          />
          <DetailCard
            label="Runtime"
            value={`${item.minutes} mins`}
          />
          <DetailCard
            label="Rating"
            value={item.rating}
          />
          <DetailCard
            label="Genre"
            value={item.genre}
          />
          <DetailCard
            label="Director"
            value={item.director}
          />
        </Grid>
      </CardContent>
    }
    {...props}
  />
);

export default MovieCardMediaImage;
