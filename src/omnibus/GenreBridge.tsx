import { useState } from "react";
import { CardContent, Stack, Typography } from "@mui/material";
import { Category } from "@mui/icons-material";
import { INLINE_SWATCH_SIZE, ProportionalBar, Swatch } from "../common/Card";
import { SectionHeader } from "../common/SectionHeader";
import { FoldedChart } from "../common/FoldedChart";
import { LABEL_SX, MUTED_FIGURE_SX } from "../common/typography";
import { format } from "../utils/mathUtils";
import { useSelectBox } from "../common/SelectBoxHook";
import { BRIDGE_KEYS, genreBridge, type BridgeKey, type GenreBridgeRow } from "./genreBridgeData";
import type { OmniItem } from "./adapter";
import { media, mediumToColour, mediumToLabel, type Measure } from "./types";
import { useScheme } from "../common/useScheme";
import { decadeToColour, genreToColour, ageBandToColour, releaseDecade, type Scheme } from "../utils/types";
import type { Colour } from "../utils/types";

/** The figure's unit, short enough to sit beside a five-digit number in the figure column. */
const UNIT: Record<Measure, string> = { Hours: "hrs", Items: "items" };

/** The plural a key's rows are counted in, and the title's first word. */
const KEY_NOUN: Record<BridgeKey, string> = { genre: "Genres", year: "Years", decade: "Decades", rating: "Ratings" };

/**
 * The swatch a row wears: the vocabulary the app already speaks for that field, as the gallery's
 * shelves wear it, so a row here and a shelf there name a genre or a certificate the same way. A
 * year wears its decade's, the one time vocabulary the page colours.
 */
const rowColour = (name: string, key: BridgeKey, scheme: Scheme): Colour | undefined => {
  switch (key) {
    case "genre":
      return genreToColour(name, scheme);
    case "rating":
      return ageBandToColour(name, scheme);
    case "decade":
      return decadeToColour(name, scheme);
    case "year":
      return decadeToColour(releaseDecade(Number(name)), scheme);
  }
};

/**
 * Every genre the reader has spent time in, and how it divides between the four media in the
 * page's measure.
 *
 * A genre held by one medium is a solid bar rather than an omission. Held back until a second
 * medium arrives, it accrues its whole weight unseen and then appears at full size on one entry
 * logged elsewhere — a step change in the card that says nothing about the genre. The full bar is
 * the same reading as any other row, at the one composition a single medium can have.
 *
 * The dim is one piece of state for the whole card, so hovering a medium anywhere fades it in
 * every row at once — which is what turns a stack of independent bars into a comparison down the
 * column.
 */
const GenreBridge = ({ items, measure }: { items: OmniItem[]; measure: Measure }) => {
  const scheme = useScheme();

  const [hovered, setHovered] = useState<string | null>(null);
  // Genre is what the section opens on, the composition the union most plainly has; the rest are
  // the same question asked of when an item was met and what it was certified.
  const [key, keySelect] = useSelectBox(BRIDGE_KEYS, "genre");
  const rows = genreBridge(items, key, measure);

  const biggest = rows[0];

  return (
    <FoldedChart
      header={
        <SectionHeader
          icon={<Category />}
          title={`${KEY_NOUN[key]} by medium`}
          count={`${format(rows.length)} ${KEY_NOUN[key].toLowerCase()}`}
          action={
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: "center", flexWrap: "wrap" }}
            >
              {keySelect}
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
                    colour={mediumToColour(medium, scheme)}
                    size={INLINE_SWATCH_SIZE}
                  />
                  <Typography variant="caption">{mediumToLabel(medium)}</Typography>
                </Stack>
              ))}
            </Stack>
          }
        />
      }
      // The rows open on genre, biggest first, so the first is the genre the library is most made
      // of, and how it divides is the whole question the section asks.
      fold={() => ({
        summary: biggest
          ? `${biggest.name} leads with ${format(biggest.amount)} ${measure.toLowerCase()} across ${format(biggest.segments.length)} media`
          : "",
        preview: biggest && (
          <BridgeRow
            row={biggest}
            colour={rowColour(biggest.name, key, scheme)}
            unit={UNIT[measure]}
          />
        ),
      })}
    >
      <CardContent>
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <BridgeRow
              key={row.name}
              row={row}
              colour={rowColour(row.name, key, scheme)}
              unit={UNIT[measure]}
              hovered={hovered}
              onHover={setHovered}
            />
          ))}
        </Stack>
      </CardContent>
    </FoldedChart>
  );
};

/** The genre column, wide enough for the names the two vocabularies actually hold. */
const GENRE_WIDTH = 14;
/**
 * The hours column, wide enough that the figure always sits on one line.
 *
 * A fixed width is what makes the bars all end level, and it has to clear the widest figure the
 * section can produce or it decides per row how many lines that row is: at seven the column is
 * 56px and "8,833 hrs" needs 71, so a genre above two digits wraps its unit onto a second line
 * while the two smallest keep to one — the same figure presented two ways down one column.
 *
 * Eleven is 88px, which clears the union's whole 20,192 hours and their unit at 79. A genre cannot
 * outgrow the union, so nothing this section can be handed reaches it; `noWrap` on the figure keeps
 * that a guarantee rather than a measurement that has to be revisited.
 */
const HOURS_WIDTH = 11;

/**
 * One row, split by medium. The hover pair is optional for the same reason the bar's is:
 * the folded card's preview draws this row as a picture of the section, with nothing to dim it
 * against.
 */
const BridgeRow = ({
  row,
  colour,
  unit,
  hovered,
  onHover,
}: {
  row: GenreBridgeRow;
  /** The row's swatch, in the vocabulary of the key it was built on. */
  colour: Colour | undefined;
  unit: string;
  hovered?: string | null;
  onHover?: (name: string | null) => void;
}) => {
  const scheme = useScheme();

  return (
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
        {colour && (
          <Swatch
            colour={colour}
            size={INLINE_SWATCH_SIZE}
          />
        )}
        <Typography
          variant="body2"
          noWrap
        >
          {row.name}
        </Typography>
      </Stack>
      <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
        <ProportionalBar
          items={row.segments.map((segment) => ({
            name: mediumToLabel(segment.medium),
            percent: segment.percent,
            colour: mediumToColour(segment.medium, scheme),
          }))}
          hovered={hovered}
          onHover={onHover}
        />
      </Stack>
      <Typography
        variant="caption"
        noWrap
        sx={{
          width: (theme) => theme.spacing(HOURS_WIDTH),
          flexShrink: 0,
          textAlign: "right",
          ...MUTED_FIGURE_SX,
          ...LABEL_SX,
        }}
      >
        {`${format(row.amount)} ${unit}`}
      </Typography>
    </Stack>
  );
};

export default GenreBridge;
