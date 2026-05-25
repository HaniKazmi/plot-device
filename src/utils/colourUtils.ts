import { FastAverageColor } from "fast-average-color";
import { Colour } from "./types";

const fac = new FastAverageColor();
const map: Record<string, Colour> = {};

export const imageToColour = (img: HTMLImageElement | string | undefined, setColour?: (colour: Colour) => void) => {
  if (img === undefined || img === null) {
    console.error("No Image");
    return undefined;
  }

  if (typeof img === "string") {
    return map[encodeURI(img)];
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

    const c = colour.hex.substring(1); // strip #
    const rgb = parseInt(c, 16); // convert rrggbb to decimal
    const r = (rgb >> 16) & 0xff; // extract red
    const g = (rgb >> 8) & 0xff; // extract green
    const b = (rgb >> 0) & 0xff; // extract blue

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709

    if (!(luma >= 30 && luma < 230)) {
      colour = await fac.getColorAsync(img, { algorithm: "simple" });
    }

    setColour((map[img.src] = colour.hex as Colour));
  } catch (err) {
    console.error("Failed to extract color from image:", err);
  }
};
