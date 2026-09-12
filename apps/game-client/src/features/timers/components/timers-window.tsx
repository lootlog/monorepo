import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { DraggableWindow } from "@/components/draggable-window";
import { useTimersWindowModel } from "@/features/timers/hooks/use-timers-window-model";
import { TimersActions } from "./shared/timers-actions";
import { TimersSurface } from "./timers-surface";

type TimersWindowProps = {
  isOpen: boolean;
};

const MIN_WINDOW_HEIGHT = 108;

export const TimersWindow: FC<TimersWindowProps> = ({ isOpen }) => {
  const { t } = useTranslation("timers");
  const model = useTimersWindowModel("window", isOpen);

  // Compact view belongs to the legacy layout; the modern one hides parts
  // through its own appearance switches instead.
  const compactView = model.layout === "legacy" && model.appearance.compactView;

  return (
    <DraggableWindow
      isOpen={isOpen}
      id="timers"
      contentClassName={
        model.layout === "modern" ? "ll:-mx-1 ll:-mb-1" : undefined
      }
      title={t("window.title")}
      onClose={model.actions.close}
      minHeight={MIN_WINDOW_HEIGHT}
      disableTitle={compactView}
      draggableContent={compactView}
      actions={
        compactView ? undefined : <TimersActions toolbar={model.toolbar} />
      }
    >
      <div className="ll:flex ll:flex-col ll:h-full">
        <TimersSurface model={model} surface="window" />
      </div>
    </DraggableWindow>
  );
};
