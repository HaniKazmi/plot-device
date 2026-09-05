/**
 * The Games components, behind the chunk that draws them.
 *
 * A registry keyed by medium is reachable from the shell, so anything named in `module.ts` lands
 * in the first bundle a visitor downloads. Cards and hover cards are deliberately not there, and
 * this file is where they stay out of it.
 */
export { default as CardMediaImage, VgHoverCard as HoverCard } from "./CardMediaImage";
