import { isValidElement, type ReactElement } from "react";

import { Button } from "@lootlog/ui/components/button";

export type RenderProp =
  | ReactElement
  | ((...args: never[]) => ReactElement)
  | undefined;

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
