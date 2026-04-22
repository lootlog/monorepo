import { Button } from "@/components/ui/button";
import { DraggableWindow } from "@/components/draggable-window";
import { useWindowsStore } from "@/store/windows.store";
import { type FC, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface TimerSettingsConflictDialogProps {
  onResolve: (choice: "local" | "remote") => void;
  localUpdatedAt?: number;
  remoteUpdatedAt?: Date;
}

export const TimerSettingsConflictDialog: FC<
  TimerSettingsConflictDialogProps
> = ({ onResolve, localUpdatedAt, remoteUpdatedAt }) => {
  const { t } = useTranslation(["timers", "common"]);
  const setPosition = useWindowsStore((state) => state.setPosition);

  useEffect(() => {
    const centerX = (window.innerWidth - 420) / 2;
    const centerY = (window.innerHeight - 320) / 2;
    setPosition("timer-settings-conflict", { x: centerX, y: centerY });
  }, [setPosition]);

  const formatDate = (date: Date | number | undefined) => {
    if (!date) return t("common:states.unknown");
    const d = typeof date === "number" ? new Date(date) : date;
    return d.toLocaleString();
  };

  return (
    <DraggableWindow
      id="timer-settings-conflict"
      title={t("window.conflictTitle")}
      closable={false}
      resizable={false}
      minWidth={420}
      minHeight={320}
    >
      <div className="ll:p-4 ll:space-y-4 ll:text-white">
        <p className="ll:text-sm ll:text-gray-300 ll:mb-4">
          {t("conflictDialog.description")}
        </p>

        <div className="ll:space-y-3">
          <div className="ll:rounded-lg ll:border ll:border-white/20 ll:p-3 ll:bg-black/30">
            <div className="ll:mb-2 ll:font-medium">
              {t("conflictDialog.localTitle")}
            </div>
            <div className="ll:text-sm ll:text-gray-400 ll:mb-3">
              {t("conflictDialog.lastUpdated", {
                date: formatDate(localUpdatedAt),
              })}
            </div>
            <Button onClick={() => onResolve("local")} className="ll:w-full">
              {t("conflictDialog.useLocal")}
            </Button>
          </div>

          <div className="ll:rounded-lg ll:border ll:border-white/20 ll:p-3 ll:bg-black/30">
            <div className="ll:mb-2 ll:font-medium">
              {t("conflictDialog.remoteTitle")}
            </div>
            <div className="ll:text-sm ll:text-gray-400 ll:mb-3">
              {t("conflictDialog.lastUpdated", {
                date: formatDate(remoteUpdatedAt),
              })}
            </div>
            <Button onClick={() => onResolve("remote")} className="ll:w-full">
              {t("conflictDialog.useRemote")}
            </Button>
          </div>
        </div>

        <p className="ll:text-xs ll:text-gray-400 ll:mt-4">
          {t("conflictDialog.warning")}
        </p>
      </div>
    </DraggableWindow>
  );
};
