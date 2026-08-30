import { CardContent, Grid } from "@mui/material";
import { CardMediaImage, DetailCard, TypedCardMediaImage } from "../common/Card";
import { Movie } from "./types";
import { namesTheSameThing } from "../utils/stringUtils";

const MovieCardMediaImage: TypedCardMediaImage<Movie> = ({ item, ...props }) => (
  <CardMediaImage
    alt={item.name}
    image={item.banner}
    detailComponent={() => (
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
            value={[item.genre, ...item.genres].join(" · ")}
          />
          <DetailCard
            label="Director"
            value={item.director}
          />
          {/* A film with no wider franchise carries its own name in the column, so the tile
              appears only where it names something to belong to rather than the film over again. */}
          {!namesTheSameThing(item.franchise, item.name) && (
            <DetailCard
              label="Franchise"
              value={item.franchise}
            />
          )}
          {item.score !== undefined && (
            <DetailCard
              label="Score"
              value={`${item.score}/10`}
            />
          )}
          {item.cinema && (
            <DetailCard
              label="Seen In"
              value="Cinema"
            />
          )}
        </Grid>
      </CardContent>
    )}
    {...props}
  />
);

export default MovieCardMediaImage;
