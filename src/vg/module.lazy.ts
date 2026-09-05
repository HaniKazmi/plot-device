/**
 * The Games components, behind the chunk that draws them.
 *
 * A registry keyed by medium is reachable from the shell, so anything named in `module.ts` lands
 * in the first bundle a visitor downloads. Cards and hover cards are deliberately not there, and
 * this file is where they stay out of it.
 *
 * These two and nothing else. The lookup over the four is dynamic (`MEDIA_LAZY[item.medium]`), so
 * a bundler keeps every export this file has in the chunk that lookup pulls in — which the union
 * prefetches on every visit for its hover cards. A third export here is weight on that chunk
 * whether or not a card is ever opened; the drawer's icons sit in `filterIcons.ts` for that reason.
 */
export { default as CardMediaImage, VgHoverCard as HoverCard } from "./CardMediaImage";
