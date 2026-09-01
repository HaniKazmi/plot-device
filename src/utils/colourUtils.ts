import { FastAverageColor, type FastAverageColorResult } from "fast-average-color";
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

const linearise = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const delinearise = (c: number) => (c <= 0.00304 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

/**
 * A `#rrggbb` colour with `amount` of its chroma taken out — 0 returns it untouched, 1 flattens it
 * to grey — keeping its hue and, exactly, its luminance.
 *
 * The channels are pulled toward the colour's own luminance **in linear light**, which is what
 * makes the luminance preservation exact rather than approximate: luminance is a linear
 * combination of the linear channels, so a linear blend toward a grey already at that luminance
 * cannot move it. Contrast is a function of luminance alone, so a desaturated fill clears exactly
 * what its source cleared and the fill contract carries over for free — worth the two transfer
 * functions, because the shared genre ramp sits within 0.1 of the 3:1 floor on four of its
 * entries and anything approximate pushes them under.
 *
 * Blending in sRGB space instead darkens: the same operation on gamma-encoded values undershoots,
 * which costs Horror 3.08 → 2.50 against the dark paper. `luma` above is not the function to reach
 * for either — it weights gamma-encoded values, which answers "can text sit on this" rather than
 * "what does this contrast against".
 *
 * A colour that does not parse as hex reads as black, exactly as in `luma`.
 */
export const desaturate = (hex: string, amount: number): Colour => {
  const rgb = parseInt(hex.replace("#", ""), 16);
  const channels = [16, 8, 0].map((shift) => linearise(((rgb >> shift) & 0xff) / 255));
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  const [r, g, b] = channels.map((c) => Math.round(255 * delinearise(c + (luminance - c) * amount)));

  // The leading bit pads the result to six digits, which a dark channel would otherwise lose.
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}` as Colour;
};

/**
 * The one key both sides of the cache agree on.
 *
 * Colours are stored against `img.src`, which the DOM has already resolved and percent-encoded,
 * while a lookup from a domain model holds the raw sheet value — `…/Ted Lasso` against
 * `…/Ted%20Lasso`. The URL parser produces exactly what the DOM does and is a fixed point on its
 * own output, so putting both sides through it makes them meet. `encodeURI` cannot do the job: it
 * escapes `%` itself, so it corrupts the side that is already encoded.
 *
 * Unicode is not normalised, so the NFC and NFD spellings of one name stay distinct keys. That
 * matches the DOM, and both sides derive from the same sheet string, so they agree regardless.
 *
 * Banners are absolute URLs; a relative one throws, and keeping it raw leaves it missing the cache
 * rather than inventing a key for it.
 */
export const cacheKey = (url: string) => {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
};

/** The colour already read for a banner, if anything has read it this session. */
export const cachedColour = (src: string | undefined) => (src ? map[cacheKey(src)] : undefined);

/** Hands over the cached colour, or reads one off the image and hands that over once it arrives. */
export const extractColourFrom = (img: HTMLImageElement, onColour: (colour: Colour) => void) => {
  const cached = cachedColour(img.src);
  if (cached) {
    onColour(cached);
    return;
  }

  colourForImgAsync(img, onColour);
};

/**
 * One extraction per src at a time. The same banner is rendered by several cards, and each one
 * reading the canvas separately duplicates the decode; every subscriber gets the shared result.
 */
const inFlight = new Map<string, Promise<Colour | undefined>>();

const colourForImgAsync = (img: HTMLImageElement, onColour: (colour: Colour) => void) => {
  // Keyed the same way as `map`, so the two never disagree about what counts as one banner.
  const key = cacheKey(img.src);
  let pending = inFlight.get(key);
  if (!pending) {
    pending = extractColourFromImg(img, key);
    inFlight.set(key, pending);
  }
  pending.then((colour) => colour && onColour(colour));
};

/**
 * Whether the canvas read produced no pixels at all.
 *
 * Every fast-average-color algorithm bails to its `defaultColor` — fully transparent, and so
 * `#000000` in hex — the moment the accumulated alpha is zero. A drawn image always carries
 * alpha, so a zero total means `drawImage` wrote nothing, not that the banner is black. The two
 * are indistinguishable from the hex alone, which is why the alpha channel is the thing checked.
 */
const isEmptyRead = (colour: FastAverageColorResult) => colour.value[3] === 0;

/**
 * A second pass costs one more decode and rescues an image whose pixels were not ready for the
 * first. Past that the failure is not transient and retrying in a loop just burns main thread.
 */
const READ_ATTEMPTS = 2;

const extractColourFromImg = async (img: HTMLImageElement, key: string): Promise<Colour | undefined> => {
  try {
    for (let attempt = 1; attempt <= READ_ATTEMPTS; attempt++) {
      // `load` fires when the bytes have arrived, which is not when the pixels exist. Safari
      // decodes lazily and discards the decoded frame of an image it is not currently painting,
      // and drawing an image in that state to a canvas silently writes transparent pixels.
      // `decode()` resolves only once there is a frame ready to draw; it also subsumes waiting
      // for load, so an image that has not arrived yet is handled by the same await. A rejection
      // still leaves the read worth attempting: fast-average-color reports its own error if the
      // image really is unreadable.
      await img.decode().catch(() => {});

      let colour = await fac.getColorAsync(img, {
        algorithm: "dominant",
        ignoredColor: [
          [255, 255, 255, 255, 5], // white
          [0, 0, 0, 255, 5], // black
        ],
      });
      if (isEmptyRead(colour)) continue;

      if (!isUsableColour(colour.hex)) {
        const simple = await fac.getColorAsync(img, { algorithm: "simple" });
        if (!isEmptyRead(simple)) colour = simple;
      }

      return (map[key] = colour.hex as Colour);
    }

    // Deliberately not cached and not applied: a card left with no colour keeps the theme's own
    // background, and the next mount of the same banner gets to try again once it has decoded.
    return undefined;
  } catch (err) {
    console.error("Failed to extract color from image:", key, err);
    return undefined;
  } finally {
    inFlight.delete(key);
  }
};
