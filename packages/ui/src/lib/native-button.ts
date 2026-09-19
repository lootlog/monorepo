import { isValidElement, type ReactElement } from "react";

import { Button } from "@lootlog/ui/components/button";

/**
 * A Base UI `render` prop: an element to render instead of the component's own,
 * or a function returning one.
 */
export type RenderProp =
  | ReactElement
  | ((...args: never[]) => ReactElement)
  | undefined;

/**
 * Base UI components whose `nativeButton` defaults to `false` (menu items in
 * particular) warn when the `render` prop supplies a native `<button>`, because
 * they would then apply non-native attributes on top of native behavior. Our
 * `Button` renders a native `<button>` unless it is itself composed with
 * another element, so resolve the flag from the `render` element instead of
 * expecting every call site to repeat it.
 *
 * Returns `undefined` when the rendered element is unknown, leaving the Base UI
 * default in effect.
 */
export function nativeButtonForRender(render: RenderProp): true | undefined {
  if (!isValidElement(render)) {
    return undefined;
  }

  if (render.type === "button") {
    return true;
  }

  if (render.type !== Button) {
    return undefined;
  }

  // SAFETY: the element is a `Button`, whose props carry an optional Base UI
  // `render` prop of the same shape.
  const { render: composedRender } = render.props as { render?: RenderProp };

  return composedRender === undefined
    ? true
    : nativeButtonForRender(composedRender);
}
