import { FastAverageColor } from "fast-average-color";
import { Colour } from "./types";

const fac = new FastAverageColor();
const map: Record<string, Colour> = {};

/**
 * Perceived brightness of a `#rrggbb` colour on a 0–255 scale, per ITU-R BT.709.
 *
 * Anything that does not parse as hex reads as 0: `parseInt` gives `NaN` and the bitwise
 * extractions coerce that to zero, so a malformed colour is indistinguishable from black.
 * Both are rejected by `isUsableColour`, so the two cases lead to the same place.
 */
export const luma = (hex: string) => {
  const rgb = parseInt(hex.replace("#", ""), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Whether a colour sits far enough from both extremes to carry readable text.
 *
 * The window is 30 ≤ luma < 230. A colour outside it is discarded in favour of the averaging
 * algorithm, which lands nearer the middle of the range.
 */
export const isUsableColour = (hex: string) => {
  const value = luma(hex);
  return value >= 30 && value < 230;
};

/** Appends a hex alpha byte to a `#rrggbb` colour, e.g. `withAlpha(colour, "90")`. */
export const withAlpha = (hex: string, alpha: string) => (hex + alpha) as Colour;

export const imageToColour = (img: HTMLImageElement | string | undefined, setColour?: (colour: Colour) => void) => {
  if (img === undefined || img === null) {
    console.error("No Image");
    return undefined;
  }

  // Keyed on the raw string both ways. `HTMLImageElement.src` is already percent-encoded by the
  // DOM, so running the string branch through encodeURI would address a different entry — and
  // encodeURI escapes `%` itself, so it cannot simply be applied to both.
  if (typeof img === "string") {
    return map[img];
  }

  if (setColour) {
    if (map[img.src]) {
      setColour(map[img.src]);
    } else {
      colourForImgAsync(img, setColour);
    }
  }

  return map[img.src];
};

const colourForImgAsync = async (img: HTMLImageElement, setColour: (colour: Colour) => void) => {
  try {
    let colour = await fac.getColorAsync(img, {
      algorithm: "dominant",
      ignoredColor: [
        [255, 255, 255, 255, 5], // white
        [0, 0, 0, 255, 5], // black
      ],
    });

    if (!isUsableColour(colour.hex)) {
      colour = await fac.getColorAsync(img, { algorithm: "simple" });
    }

    setColour((map[img.src] = colour.hex as Colour));
  } catch (err) {
    console.error("Failed to extract color from image:", err);
  }
};
