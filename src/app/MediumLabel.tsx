import { Box } from "@mui/material";
import { LABEL_SX } from "../common/typography";
import type { Scheme } from "../utils/types";
import { mediumToColour, mediumToName, type Medium } from "./types";

/**
 * The band along the top of a picture naming its medium, and how tall it stands.
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
    <Box
      sx={(theme) => ({
        height: MEDIUM_LABEL_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingX: 1,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: colour,
        color: theme.palette.getContrastText(colour),
        ...LABEL_SX,
      })}
    >
      {mediumToName(medium)}
    </Box>
  );
};
