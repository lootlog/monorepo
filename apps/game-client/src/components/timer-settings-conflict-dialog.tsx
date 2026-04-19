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
  const { t } = useTranslation();
  const setPosition = useWindowsStore((state) => state.setPosition);

  useEffect(() => {
    const centerX = (window.innerWidth - 420) / 2;
    const centerY = (window.innerHeight - 320) / 2;
    setPosition("timer-settings-conflict", { x: centerX, y: centerY });
  }, [setPosition]);

  const formatDate = (date: Date | number | undefined) => {
    if (!date) return t("settings.timerSettingsConflict.unknownDate");
    const d = typeof date === "number" ? new Date(date) : date;
    return d.toLocaleString();
  };

  return (
    <DraggableWindow
      id="timer-settings-conflict"
      title={t("settings.timerSettingsConflict.title")}
      closable={false}
      resizable={false}
      minWidth={420}
      minHeight={320}
    >
      <div className="ll:p-4 ll:space-y-4 ll:text-white">
        <p className="ll:text-sm ll:text-gray-300 ll:mb-4">
          {t("settings.timerSettingsConflict.summary")}
        </p>

        <div className="ll:space-y-3">
          <div className="ll:rounded-lg ll:border ll:border-white/20 ll:p-3 ll:bg-black/30">
            <div className="ll:mb-2 ll:font-medium">
              {t("settings.timerSettingsConflict.localTitle")}
            </div>
            <div className="ll:text-sm ll:text-gray-400 ll:mb-3">
              {t("settings.timerSettingsConflict.updatedAt", {
                date: formatDate(localUpdatedAt),
              })}
            </div>
            <Button onClick={() => onResolve("local")} className="ll:w-full">
              {t("settings.timerSettingsConflict.useLocal")}
            </Button>
          </div>

          <div className="ll:rounded-lg ll:border ll:border-white/20 ll:p-3 ll:bg-black/30">
            <div className="ll:mb-2 ll:font-medium">
              {t("settings.timerSettingsConflict.remoteTitle")}
            </div>
            <div className="ll:text-sm ll:text-gray-400 ll:mb-3">
              {t("settings.timerSettingsConflict.updatedAt", {
                date: formatDate(remoteUpdatedAt),
              })}
            </div>
            <Button onClick={() => onResolve("remote")} className="ll:w-full">
              {t("settings.timerSettingsConflict.useRemote")}
            </Button>
          </div>
        </div>

        <p className="ll:text-xs ll:text-gray-400 ll:mt-4">
          {t("settings.timerSettingsConflict.warning")}
        </p>
      </div>
    </DraggableWindow>
  );
};
