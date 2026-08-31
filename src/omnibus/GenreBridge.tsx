import { useState } from "react";
import { Card, CardContent, Stack, Typography } from "@mui/material";
import { Category } from "@mui/icons-material";
import { INLINE_SWATCH_SIZE, ProportionalBar, Swatch } from "../common/Card";
import { SectionHeader } from "../common/SectionHeader";
import { LABEL_SX } from "../common/typography";
import { format } from "../utils/mathUtils";
import type { GenreBridgeRow } from "./genreBridgeData";
import { media, mediumToColour, mediumToLabel } from "./types";

/**
 * The genres the reader meets in more than one medium, and how the hours in each are split.
 *
 * A genre with only one medium in it is left out entirely rather than drawn as a full bar: the
 * section is about the crossing, and a solid bar says nothing the Media band above has not.
 *
 * The dim is one piece of state for the whole card, so hovering a medium anywhere fades it in
 * every row at once — which is what turns a stack of independent bars into a comparison down the
 * column.
 */
const GenreBridge = ({ rows }: { rows: GenreBridgeRow[] }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <Card>
      <SectionHeader
        icon={<Category />}
        title="Genres across media"
        count={`${format(rows.length)} genres`}
        action={
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: "center", flexWrap: "wrap" }}
          >
            {media.map((medium) => (
              <Stack
                key={medium}
                direction="row"
                spacing={0.5}
                sx={{ alignItems: "center", cursor: "default" }}
                onMouseEnter={() => setHovered(mediumToLabel(medium))}
                onMouseLeave={() => setHovered(null)}
              >
                <Swatch
                  colour={mediumToColour(medium)}
                  size={INLINE_SWATCH_SIZE}
                />
                <Typography variant="caption">{mediumToLabel(medium)}</Typography>
              </Stack>
            ))}
          </Stack>
        }
      />
      <CardContent>
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <BridgeRow
              key={row.genre}
              row={row}
              hovered={hovered}
              onHover={setHovered}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

/** The genre column, wide enough for the names the two vocabularies actually hold. */
const GENRE_WIDTH = 14;
/** The hours column, at the width four digits and a label take, so the bars all end level. */
const HOURS_WIDTH = 7;

const BridgeRow = ({
  row,
  hovered,
  onHover,
}: {
  row: GenreBridgeRow;
  hovered: string | null;
  onHover: (name: string | null) => void;
}) => (
  <Stack
    direction="row"
    spacing={1}
    sx={{ alignItems: "center" }}
  >
    <Stack
      direction="row"
      spacing={0.75}
      sx={{ width: (theme) => theme.spacing(GENRE_WIDTH), flexShrink: 0, alignItems: "center" }}
    >
      {/* The genre's own colour from the ramp Shows and Movies share, so a row here and a wedge on
          either tab name the genre the same way. */}
      <Swatch
        colour={row.colour}
        size={INLINE_SWATCH_SIZE}
      />
      <Typography
        variant="body2"
        noWrap
      >
        {row.genre}
      </Typography>
    </Stack>
    <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
      <ProportionalBar
        items={row.segments.map((segment) => ({
          name: mediumToLabel(segment.medium),
          percent: segment.percent,
          colour: mediumToColour(segment.medium),
        }))}
        hovered={hovered}
        onHover={onHover}
      />
    </Stack>
    <Typography
      variant="caption"
      sx={{
        width: (theme) => theme.spacing(HOURS_WIDTH),
        flexShrink: 0,
        textAlign: "right",
        color: "text.secondary",
        fontVariantNumeric: "tabular-nums",
        ...LABEL_SX,
      }}
    >
      {`${format(row.hours)} hrs`}
    </Typography>
  </Stack>
);

export default GenreBridge;
