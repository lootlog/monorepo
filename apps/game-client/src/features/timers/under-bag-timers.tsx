import { getLootlogHostPortalThemeClassName } from "@/components/ui/theme-boundary";
import { cn } from "cn";
import type { FC, PropsWithChildren } from "react";
import { createPortal } from "react-dom";

export const UnderBagTimers: FC<PropsWithChildren> = ({ children }) => {
  const bottomWrapper = document.querySelector(
    ".right-column > .inner-wrapper > .right-main-column-wrapper > .bottom-wrapper",
  );

  if (!bottomWrapper) return null;

  return createPortal(
    <div
      className={cn(
        getLootlogHostPortalThemeClassName(),
        "ll:py-1 ll:h-full ll:max-h-full ll:bg-black/70 ll:flex ll:flex-col",
      )}
      onWheel={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    bottomWrapper,
  );
};
