import { getLootlogHostPortalThemeClassName } from "@/components/ui/theme-boundary";
import { cn } from "cn";
import type { FC } from "react";
import { createPortal } from "react-dom";
import { useTimersWindowModel } from "@/features/timers/hooks/use-timers-window-model";
import { TimersSurface } from "./timers-surface";

const BOTTOM_WRAPPER_SELECTOR =
  ".right-column > .inner-wrapper > .right-main-column-wrapper > .bottom-wrapper";

const TimersUnderBagContent: FC = () => {
  const model = useTimersWindowModel("under-bag", true);

  return <TimersSurface model={model} surface="under-bag" />;
};

/** Renders the timers into the NI interface's bag column instead of a window. */
export const TimersUnderBag: FC = () => {
  const bottomWrapper = document.querySelector(BOTTOM_WRAPPER_SELECTOR);

  if (!bottomWrapper) return null;

  return createPortal(
    <div
      className={cn(
        getLootlogHostPortalThemeClassName(),
        "ll:pl-4 ll:py-1 ll:h-full ll:pr-1.5 ll:max-h-full ll:bg-black/70 ll:relative ll:flex ll:flex-col",
      )}
      onWheel={(event) => event.stopPropagation()}
    >
      <TimersUnderBagContent />
    </div>,
    bottomWrapper,
  );
};
