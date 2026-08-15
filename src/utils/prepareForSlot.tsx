import { ComponentProps, createElement, ElementType, forwardRef } from "react";

/**
 * Wraps a component so it can be passed to a MUI `slots` prop, swallowing the internal
 * `ownerState` MUI injects. MUI exported this itself until v6; it is gone from v9.
 */
export default function prepareForSlot<ComponentType extends ElementType>(Component: ComponentType) {
  type Props = ComponentProps<ComponentType>;

  return forwardRef<HTMLElement, Props>(function Slot(props, ref) {
    const { ownerState, ...other } = props;
    return createElement<Props>(Component, {
      ...(other as Props),
      ref,
    });
  });
}
