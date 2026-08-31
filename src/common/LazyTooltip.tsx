import type { ReactNode } from "react";

/**
 * Defers a hover card to the moment MUI mounts the tooltip.
 *
 * The Popper renders nothing while closed, so passing this element costs one object per row
 * and calling the thunk costs nothing until the pointer arrives. Any surface positioning
 * hundreds of marks it will only ever show a handful of cards for wants this — building the
 * cards eagerly would hold every one of them for the life of the layout.
 */
export const LazyTooltip = ({ render }: { render: () => ReactNode }) => <>{render()}</>;
