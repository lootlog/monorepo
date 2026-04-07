import { type FC, useEffect, useState } from "react";
import { useLocalStorage } from "react-use";
import { DraggableWindow } from "@/components/draggable-window";
import { useWindowsStore } from "@/store/windows.store";
import { useLootlogCharactersConfig } from "@/hooks/api/use-lootlog-character-config";
import { Button } from "@/components/ui/button";
import { Game } from "@/lib/game";
import { storageKey } from "@/lib/storage-key";

const STORAGE_KEY = storageKey("ll-catching-whitelist-warning-dismissed");

type DismissedCharacters = Record<string, boolean>;

export const CatchingWhitelistWarning: FC = () => {
  const windowState = useWindowsStore(
    (state) => state["catching-whitelist-warning"],
  );
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { data: lootlogCharactersConfig, isSuccess } =
    useLootlogCharactersConfig();
  const characterId = String(Game.hero.id);
  const [dismissedCharacters, setDismissedCharacters] =
    useLocalStorage<DismissedCharacters>(STORAGE_KEY, {});
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!isSuccess || !characterId || hasChecked || !dismissedCharacters)
      return;

    if (dismissedCharacters[characterId]) {
      setHasChecked(true);
      return;
    }

    const config = lootlogCharactersConfig?.[characterId];
    const hasLootGuilds =
      (config?.collectLootWhitelistGuildIds?.length ?? 0) > 0;
    const hasTimerGuilds =
      (config?.addTimersWhitelistGuildIds?.length ?? 0) > 0;

    if (!hasLootGuilds && !hasTimerGuilds) {
      setOpen("catching-whitelist-warning", true);
    }

    setHasChecked(true);
  }, [
    isSuccess,
    lootlogCharactersConfig,
    characterId,
    hasChecked,
    dismissedCharacters,
    setOpen,
  ]);

  const handleClose = () => {
    if (characterId && dismissedCharacters) {
      setDismissedCharacters({
        ...dismissedCharacters,
        [characterId]: true,
      });
    }
    setOpen("catching-whitelist-warning", false);
  };

  const handleOpenSettings = () => {
    setOpen("settings", true);
    handleClose();
  };

  if (!windowState.open) return null;

  return (
    <DraggableWindow
      id="catching-whitelist-warning"
      title="Uwaga!"
      onClose={handleClose}
      variant="small"
      resizable={false}
      minWidth={400}
      minHeight={240}
      dynamicHeight
    >
      <div className="ll:p-4 ll:flex ll:flex-col ll:gap-4">
        <div className="ll:text-sm ll:text-gray-200">
          <p className="ll:mb-3">
            Nie masz wybranych żadnych serwerów do zbierania danych!
          </p>
          <p className="ll:mb-3">
            Przejdź do ustawień i wybierz serwery, na których chcesz zbierać
            timery i loot. Są w zakładce &ldquo;Dodawanie łupów i
            timerów&ldquo;.
          </p>
        </div>
        <div className="ll:flex ll:gap-2 ll:justify-end">
          <Button onClick={handleClose} className="ll:px-3 ll:py-1">
            Zamknij
          </Button>
          <Button onClick={handleOpenSettings} className="ll:px-3 ll:py-1">
            Otwórz ustawienia
          </Button>
        </div>
      </div>
    </DraggableWindow>
  );
};
