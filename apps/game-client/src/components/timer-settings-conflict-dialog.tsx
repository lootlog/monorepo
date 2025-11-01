import { Button } from "@/components/ui/button";
import { DraggableWindow } from "@/components/draggable-window";
import { useWindowsStore } from "@/store/windows.store";
import { type FC, useEffect } from "react";

interface TimerSettingsConflictDialogProps {
  onResolve: (choice: "local" | "remote") => void;
  localUpdatedAt?: number;
  remoteUpdatedAt?: Date;
}

export const TimerSettingsConflictDialog: FC<
  TimerSettingsConflictDialogProps
> = ({ onResolve, localUpdatedAt, remoteUpdatedAt }) => {
  const setPosition = useWindowsStore((state) => state.setPosition);

  useEffect(() => {
    const centerX = (window.innerWidth - 420) / 2;
    const centerY = (window.innerHeight - 320) / 2;
    setPosition("timer-settings-conflict", { x: centerX, y: centerY });
  }, [setPosition]);

  const formatDate = (date: Date | number | undefined) => {
    if (!date) return "Nieznana";
    const d = typeof date === "number" ? new Date(date) : date;
    return d.toLocaleString();
  };

  return (
    <DraggableWindow
      id="timer-settings-conflict"
      title="Konflikt ustawień timerów"
      closable={false}
      resizable={false}
      minWidth={420}
      minHeight={320}
    >
      <div className="ll:p-4 ll:space-y-4 ll:text-white">
        <p className="ll:text-sm ll:text-gray-300 ll:mb-4">
          Twoje ustawienia timerów zostały zmodyfikowane na wielu urządzeniach.
          Którą wersję chcesz zachować?
        </p>

        <div className="ll:space-y-3">
          <div className="ll:rounded-lg ll:border ll:border-white/20 ll:p-3 ll:bg-black/30">
            <div className="ll:mb-2 ll:font-medium">
              Lokalne (To urządzenie)
            </div>
            <div className="ll:text-sm ll:text-gray-400 ll:mb-3">
              Ostatnia aktualizacja: {formatDate(localUpdatedAt)}
            </div>
            <Button onClick={() => onResolve("local")} className="ll:w-full">
              Użyj ustawień lokalnych
            </Button>
          </div>

          <div className="ll:rounded-lg ll:border ll:border-white/20 ll:p-3 ll:bg-black/30">
            <div className="ll:mb-2 ll:font-medium">Zdalne (Serwer)</div>
            <div className="ll:text-sm ll:text-gray-400 ll:mb-3">
              Ostatnia aktualizacja: {formatDate(remoteUpdatedAt)}
            </div>
            <Button onClick={() => onResolve("remote")} className="ll:w-full">
              Użyj ustawień z serwera
            </Button>
          </div>
        </div>

        <p className="ll:text-xs ll:text-gray-400 ll:mt-4">
          Uwaga: Wybrane ustawienia nadpiszą drugą wersję.
        </p>
      </div>
    </DraggableWindow>
  );
};
