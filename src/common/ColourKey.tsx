import { Stack, Typography } from "@mui/material";
import { INLINE_SWATCH_SIZE, Swatch } from "./Swatch";
import { LABEL_SX } from "./typography";

/**
 * A colour vocabulary's legend: the field it speaks, then a swatch and a word per value drawn.
 *
 * Every surface colouring its marks by a field the page does not otherwise spell out draws one
 * under its header — the library's card borders, a timeline coloured by whatever its select says.
 * Naming the field alone ("border · status") tells a reader that the colours mean something without
 * telling them what any of them means; a row of dots and words is a legend a reader can read the
 * marks by.
 */
export const ColourKey = ({
  field,
  entries,
}: {
  field: string;
  entries: readonly { value: string; colour: string }[];
}) => (
  <Stack
    direction="row"
    spacing={1.5}
    sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5, paddingX: 2, paddingBottom: 1 }}
  >
    <Typography
      variant="caption"
      sx={{ ...LABEL_SX, color: "text.secondary" }}
    >
      {field}
    </Typography>
    {entries.map((entry) => (
      <Stack
        key={entry.value}
        direction="row"
        spacing={0.5}
        sx={{ alignItems: "center" }}
      >
        <Swatch
          colour={entry.colour}
          size={INLINE_SWATCH_SIZE}
        />
        <Typography variant="caption">{entry.value}</Typography>
      </Stack>
    ))}
  </Stack>
);
