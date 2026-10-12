import { CardContent, Stack, Typography } from "@mui/material";
import { NothingToPlot } from "../common/NothingMatches";
import { useHoverDim } from "../common/hoverDim";
import { Category } from "@mui/icons-material";
import { ProportionalBar } from "../common/ProportionalBar";
import { INLINE_SWATCH_SIZE, Swatch } from "../common/Swatch";
import { FoldedChart } from "../common/FoldedChart";
import { LABEL_SX, MUTED_FIGURE_SX } from "../common/typography";
import { format } from "../utils/mathUtils";
import { stated } from "../common/population";
import { useSelectBox } from "../common/SelectBoxHook";
import { SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import { useState } from "react";
import { BRIDGE_KEYS, genreBridge, mediumBridge, type BridgeKey } from "./genreBridgeData";
import type { OmniItem } from "../common/medium";
import { media, mediumToColour, mediumToLabel, type Measure } from "../app/types";
import { useScheme } from "../common/useScheme";
import {
  decadeToColour,
  genreToColour,
  certificateBandToColour,
  releaseDecade,
  styleToColour,
  type Scheme,
} from "../utils/types";
import { neutralFill, type Colour } from "../utils/types";

/** The figure's unit, short enough to sit beside a five-digit number in the figure column. */
const UNIT: Record<Measure, string> = { Hours: "hrs", Items: "items" };

/** The plural a key's rows are counted in, and the title's first word. */
const KEY_NOUN: Record<BridgeKey, string> = {
  genre: "Genres",
  year: "Years",
  decade: "Decades",
  certificate: "Certificates",
  style: "Styles",
};

/** Which way the bars run: a row per value split by medium, or a row per medium split by value. */
type Orientation = "byMedium" | "byKey";

/**
 * The swatch a row wears: the vocabulary the app already speaks for that field, as the gallery's
 * shelves wear it, so a row here and a shelf there name a genre or a certificate the same way. A
 * year wears its decade's, the one time vocabulary the page colours, and a style the fill its
 * band on every home tab wears.
 */
const rowColour = (name: string, key: BridgeKey, scheme: Scheme): Colour | undefined => {
  switch (key) {
    case "genre":
      return genreToColour(name, scheme);
    case "certificate":
      return certificateBandToColour(name, scheme);
    case "decade":
      return decadeToColour(name, scheme);
    case "year":
      return decadeToColour(releaseDecade(Number(name)), scheme);
    case "style":
      return styleToColour(name, scheme);
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
 *
 * The switch turns it over: a row per medium, split by the same values (`mediumBridge`) — what the
 * games are made of against what the films are, where the unturned rows say who made each genre.
 * The values then key the bars, so they stand as the key under the header, and the dim follows a
 * value down the four rows.
 */
const GenreBridge = ({ items, measure }: { items: OmniItem[]; measure: Measure }) => {
  const scheme = useScheme();

  const [hovered, setHovered] = useHoverDim();
  // Genre is what the section opens on, the composition the union most plainly has; the rest are
  // the same question asked of when an item was met and what it was certified.
  const [orientation, setOrientation] = useState<Orientation>("byMedium");
  const turned = orientation === "byKey";
  const [key, keySelect] = useSelectBox(BRIDGE_KEYS, "genre", turned ? "Split by" : "Rows");
  const unturned = genreBridge(items, key, measure).map((row) => ({
    name: row.name,
    colour: rowColour(row.name, key, scheme),
    amount: row.amount,
    segments: row.segments.map((segment) => ({
      name: mediumToLabel(segment.medium),
      percent: segment.percent,
      colour: mediumToColour(segment.medium, scheme),
    })),
  }));
  const rows = turned
    ? mediumBridge(
        items,
        key,
        measure,
        unturned.map((row) => row.name),
      ).map((row) => ({
        name: mediumToLabel(row.medium),
        colour: mediumToColour(row.medium, scheme) as Colour | undefined,
        amount: row.amount,
        segments: row.segments.map((segment) => ({
          name: segment.name,
          percent: segment.percent,
          colour: rowColour(segment.name, key, scheme) ?? neutralFill(scheme),
        })),
      }))
    : unturned;
  const orientations: readonly SegmentOption<Orientation>[] = [
    { value: "byMedium", label: "By medium" },
    { value: "byKey", label: `By ${key}` },
  ];

  const biggest = rows[0];

  return (
    <FoldedChart
      icon={<Category />}
      title={turned ? `Media by ${key}` : `${KEY_NOUN[key]} by medium`}
      count={turned ? undefined : stated(rows.length, KEY_NOUN[key].toLowerCase())}
      // The section is gated on the grouping it opens with, and the reader's own pick can empty
      // what that gate let through: a book has no style, so a page holding books alone has genres
      // to bridge and no styles.
      blank={rows.length === 0 ? <NothingToPlot /> : undefined}
      // The picker chooses what a row is and the swatches key the bars: both are about a stack
      // that is not drawn until the card is opened, and the fold's own line names its leading row
      // in words.
      // The header holds the two choices about the bars and nothing else: the key naming their
      // colours stands above them, where a half-width card has the room the header does not.
      controls={
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center" }}
        >
          <SegmentedControl
            options={orientations}
            value={orientation}
            onChange={setOrientation}
            ariaLabel="Split"
          />
          {keySelect}
        </Stack>
      }
      // The rows open on genre, biggest first, so the first is the genre the library is most made
      // of, and how it divides is the whole question the section asks.
      fold={() => ({
        summary: biggest
          ? `${biggest.name} leads with ${format(biggest.amount)} ${measure.toLowerCase()} across ${format(biggest.segments.length)} ${turned ? KEY_NOUN[key].toLowerCase() : "media"}`
          : "",
        preview: biggest && (
          <BridgeRow
            row={biggest}
            unit={UNIT[measure]}
          />
        ),
      })}
    >
      <CardContent>
        <Stack spacing={1.5}>
          {/* The key to the bars' colours, above them in the order every bar runs them: the four
              media, or turned over, the values. Hovering one dims it down every row. */}
          <Stack
            direction="row"
            sx={{ flexWrap: "wrap", columnGap: 1.5, rowGap: 0.5 }}
          >
            {(turned
              ? unturned.map((value) => ({ name: value.name, colour: value.colour ?? neutralFill(scheme) }))
              : media.map((medium) => ({ name: mediumToLabel(medium), colour: mediumToColour(medium, scheme) }))
            ).map((entry) => (
              <Stack
                key={entry.name}
                direction="row"
                spacing={0.5}
                sx={{ alignItems: "center", cursor: "default" }}
                onMouseEnter={() => setHovered(entry.name)}
                onMouseLeave={() => setHovered(null)}
              >
                <Swatch
                  colour={entry.colour}
                  size={INLINE_SWATCH_SIZE}
                />
                <Typography variant="caption">{entry.name}</Typography>
              </Stack>
            ))}
          </Stack>
          {rows.map((row) => (
            <BridgeRow
              key={row.name}
              row={row}
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

/** One row as drawn: its name and swatch, its whole, and its bar's segments already coloured. */
interface DrawnRow {
  name: string;
  /** The row's swatch, in the vocabulary of what the row is. */
  colour: Colour | undefined;
  amount: number;
  segments: { name: string; percent: number; colour: string }[];
}

/**
 * One row, split by medium or, turned over, by value. The hover pair is optional for the same
 * reason the bar's is: the folded card's preview draws this row as a picture of the section, with
 * nothing to dim it against.
 */
const BridgeRow = ({
  row,
  unit,
  hovered,
  onHover,
}: {
  row: DrawnRow;
  unit: string;
  hovered?: string | null;
  onHover?: (name: string | null) => void;
}) => {
  const colour = row.colour;

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
          items={row.segments}
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
