import { useState } from "react";
import { useMatchMedia } from "./useMatchMedia";

const CAN_HOVER = "(hover: hover)";

/**
 * The one name a proportional bar and the legend beside it are dimmed against, held only where
 * the reader can hover at all.
 *
 * The dim is driven from mouse events rather than a `:hover` rule, since it reaches across two
 * elements, and a tap fires the compatibility `mouseenter` with no `mouseleave` until a later tap
 * lands on some other element: without this the segment last tapped on a phone keeps every other
 * segment and legend row at 0.3 until the reader taps elsewhere, which reads as a selection the
 * page never made. The CSS side of the same trap is `@media (hover: hover)` around the rule; this
 * is that guard for the state. The handlers stay attached, so a tablet with a mouse plugged in
 * starts answering the moment the query does.
 */
export const useHoverDim = () => {
  const [hovered, setHovered] = useState<string | null>(null);
  const canHover = useMatchMedia(CAN_HOVER);
  return [canHover ? hovered : null, setHovered] as const;
};
