import { Box, type Theme } from "@mui/material";
import { LABEL_SX } from "../common/typography";
import type { Scheme } from "../utils/types";
import { mediumToColour, mediumToName, type Medium } from "./types";

/**
 * The band along a picture naming its medium, and how tall it stands.
 *
 * A mixed row holds four media at one height, so which one a picture is has to be said somewhere
 * — and a chip in the corner says it by covering the artwork it is labelling, on every card, on
 * six shelves at once. Along the top the band has room of its own and the artwork is left whole;
 * it is filled in the medium's colour, the same fill the chart legends and the Media band use.
 *
 * The height is stated rather than left to the line, because the surfaces drawing it fix a card's
 * height and the artwork takes all of it that this band does not.
 */
export const MEDIUM_LABEL_HEIGHT = 22;

/**
 * Sized in logical terms — its stated size across the line of type, its padding along it — so the
 * band stands across the top of a picture or down its side by the writing mode of the slot it is
 * drawn in, without being told which.
 */
const LABEL_BAND_SX = {
  blockSize: MEDIUM_LABEL_HEIGHT,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  paddingInline: 1,
  fontSize: 11,
  fontWeight: 600,
  ...LABEL_SX,
} as const;

/**
 * The type on each fill, read once per fill. There are eight — four media on two papers — and a
 * wall draws a label on each of two thousand cards on every render, where the contrast is the same
 * answer each time: every tab's theme is built with one contrast threshold, so the fill alone
 * decides it.
 */
const CONTRAST = new Map<string, string>();
const contrastOn = (colour: string, theme: Theme) => {
  let text = CONTRAST.get(colour);
  if (text === undefined) {
    text = theme.palette.getContrastText(colour);
    CONTRAST.set(colour, text);
  }
  return text;
};

/**
 * What a picture is: the band filled in that medium's own colour, with type derived from the fill
 * rather than fixed — the same rule every chip and status tile in the app follows, and the reason
 * a gold band and a blue one are both legible.
 *
 * The scheme is the caller's to read: a list draws hundreds of these, and each reading it for
 * itself is a `matchMedia` subscription per card where the list needs one.
 */
export const MediumLabel = ({ medium, scheme }: { medium: Medium; scheme: Scheme }) => {
  const colour = mediumToColour(medium, scheme);

  return (
    <Box sx={[LABEL_BAND_SX, (theme) => ({ backgroundColor: colour, color: contrastOn(colour, theme) })]}>
      {mediumToName(medium)}
    </Box>
  );
};
