import { FastAverageColor } from "fast-average-color";

const fac = new FastAverageColor();
const map: Record<string, string> = {};

export const imageToColour = (img: HTMLImageElement | string | undefined) => {
  if (img === undefined || img === null) return undefined;
  if (typeof img === "string") {
    const uri = img === encodeURI(img) ? img : encodeURI(img);
    return map[uri];
  }
  return (map[img.src] ||= colourForImg(img));
};

const colourForImg = (img: HTMLImageElement) => {
  console.log(map)
  const dominantColour = fac.getColor(img, { algorithm: "dominant" }).hex;

  const c = dominantColour.substring(1); // strip #
  const rgb = parseInt(c, 16); // convert rrggbb to decimal
  const r = (rgb >> 16) & 0xff; // extract red
  const g = (rgb >> 8) & 0xff; // extract green
  const b = (rgb >> 0) & 0xff; // extract blue

  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709

  if (luma >= 40) {
    return dominantColour;
  }

  return fac.getColor(img, { algorithm: "simple" }).hex;
};
