import { FastAverageColor } from "fast-average-color";

const fac = new FastAverageColor();
const map: Record<string, string> = {};

export const imageToColour = (img: HTMLImageElement | string | undefined) => {
  if (img === undefined || img === null) return undefined;
  if (typeof img === "string") {
    const uri = img === encodeURI(img) ? img : encodeURI(img);
    return map[uri];
  }
  return (map[img.src] ||= fac.getColor(img, { algorithm: "dominant" }).hex);
};
