import { AnimatedWindow } from "@/components/animated-window";
import { DraggableWindow } from "@/components/draggable-window";
import { Button } from "@/components/ui/button";
import { storageKey } from "@/lib/storage-key";
import type { SettingsTabValue } from "@/features/settings/constants/settings-tabs";
import { useGlobalStore } from "@/store/global.store";
import { useWindowsStore } from "@/store/windows.store";
import { useEffect, useState, type FC } from "react";
import { useLocalStorage } from "react-use";

const STORAGE_KEY = storageKey("ll:backend-preferences-warning-dismissed");
const WINDOW_WIDTH = 430;
const WINDOW_HEIGHT = 250;

export const BackendPreferencesWarning: FC = () => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const open = useWindowsStore(
    (state) => state["backend-preferences-warning"].open,
  );
  const setOpen = useWindowsStore((state) => state.setOpen);
  const setPosition = useWindowsStore((state) => state.setPosition);
  const [dismissed, setDismissed] = useLocalStorage<boolean>(
    STORAGE_KEY,
    false,
  );
  const [isPositionReady, setIsPositionReady] = useState(false);

  useEffect(() => {
    if (!gameInitialized || dismissed) {
      return;
    }

    setOpen("backend-preferences-warning", true);
  }, [dismissed, gameInitialized, setOpen]);

  useEffect(() => {
    if (!open) {
      setIsPositionReady(false);
      return;
    }

    const centerX = Math.round((window.innerWidth - WINDOW_WIDTH) / 2);
    const centerY = Math.round((window.innerHeight - WINDOW_HEIGHT) / 2);
    setPosition("backend-preferences-warning", { x: centerX, y: centerY });
    setIsPositionReady(true);
  }, [open, setPosition]);

  const handleClose = () => {
    setDismissed(true);
    setOpen("backend-preferences-warning", false);
    setIsPositionReady(false);
  };

  const handleOpenSettings = () => {
    setOpen("settings", true, {
      activeTab: "npc-detector" satisfies SettingsTabValue,
    });
    handleClose();
  };

  if (!open || !isPositionReady) {
    return null;
  }

  return (
    <AnimatedWindow isOpen={open} windowKey="backend-preferences-warning">
      <DraggableWindow
        id="backend-preferences-warning"
        title="Zmiana ustawień"
        onClose={handleClose}
        variant="small"
        resizable={false}
        minWidth={WINDOW_WIDTH}
        minHeight={WINDOW_HEIGHT}
        dynamicHeight
      >
        <div className="ll:flex ll:flex-col ll:gap-4 ll:p-4">
          <div className="ll:text-sm ll:text-gray-200">
            <p className="ll:mb-3">
              Ustawienia powiadomień i wykrywacza są teraz przechowywane tylko
              po stronie serwera.
            </p>
            <p>
              Poprzednie ustawienia zapisane lokalnie w tej przeglądarce nie
              zostały zachowane. Sprawdź aktualną konfigurację w ustawieniach.
            </p>
          </div>
          <div className="ll:flex ll:justify-end ll:gap-2">
            <Button onClick={handleClose} className="ll:px-3 ll:py-1">
              Zamknij
            </Button>
            <Button onClick={handleOpenSettings} className="ll:px-3 ll:py-1">
              Otwórz ustawienia
            </Button>
          </div>
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};
