import { FastAverageColor } from "fast-average-color";
import { Colour } from "./types";

const fac = new FastAverageColor();
const map: Record<string, Colour> = {};

export const imageToColour = (img: HTMLImageElement) => {
  if (img === undefined || img === null) return undefined;
  return (map[img.src] ||= colourForImg(img));
};

const colourForImg = (img: HTMLImageElement) => {
  const dominantColour = fac.getColor(img, { algorithm: "dominant" }).hex;

  const c = dominantColour.substring(1); // strip #
  const rgb = parseInt(c, 16); // convert rrggbb to decimal
  const r = (rgb >> 16) & 0xff; // extract red
  const g = (rgb >> 8) & 0xff; // extract green
  const b = (rgb >> 0) & 0xff; // extract blue

  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709

  if ((luma >= 40 && luma < 240) || luma >= 253) {
    return dominantColour as Colour;
  }

  return fac.getColor(img, { algorithm: "simple" }).hex as Colour;
};