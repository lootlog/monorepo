import { isValidElement, type ReactElement } from "react";

import { Button } from "@lootlog/ui/components/button";

export type RenderProp =
  | ReactElement
  | ((...args: never[]) => ReactElement)
  | undefined;

export function nativeButtonForRender(render: RenderProp): true | undefined {
  if (!isValidElement<{ render?: unknown }>(render)) {
    return undefined;
  }

  if (render.type === "button") {
    return true;
  }

  if (render.type !== Button) {
    return undefined;
  }

  const composedRender = render.props.render;

  if (composedRender === undefined) {
    return true;
  }

  return isValidElement(composedRender)
    ? nativeButtonForRender(composedRender)
    : undefined;
}
