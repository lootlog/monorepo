import { getLootlogHostPortalThemeClassName } from "@/components/ui/theme-boundary";
import { cn } from "cn";
import type { FC, PropsWithChildren } from "react";
import { createPortal } from "react-dom";

export const UnderBagTimers: FC<PropsWithChildren> = ({ children }) => {
  const bottomWrapper = document.querySelector(
    ".right-column > .inner-wrapper > .right-main-column-wrapper > .bottom-wrapper",
  );

  if (!bottomWrapper) return null;

  // Layout and style containment keep the ticking timers' work inside this
  // host-page subtree. Positioned descendants already have a positioned
  // ancestor inside it, and popups portal out of it.
  return createPortal(
    <div
      className={cn(
        getLootlogHostPortalThemeClassName(),
        "ll:pl-4 ll:py-1 ll:h-full ll:pr-1.5 ll:max-h-full ll:bg-black/70 ll:flex ll:flex-col ll:[contain:layout_style]",
      )}
      onWheel={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    bottomWrapper,
  );
};
