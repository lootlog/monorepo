import { type FC, useEffect, useState } from "react";
import { useLocalStorage } from "react-use";
import { DraggableWindow } from "@/components/draggable-window";
import { useWindowsStore } from "@/store/windows.store";
import { useLootlogCharactersConfig } from "@/hooks/api/use-lootlog-character-config";
import { Button } from "@/components/ui/button";
import { Game } from "@/lib/game";
import { storageKey } from "@/lib/storage-key";
import { useTranslation } from "react-i18next";

const STORAGE_KEY = storageKey("ll:catching-whitelist-warning-dismissed");

type DismissedCharacters = Record<string, boolean>;

export const CatchingWhitelistWarning: FC = () => {
  const { t } = useTranslation(["catchingWhitelistWarning", "common"]);
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
    const hasCatchingGuilds = (config?.catchingGuildIds?.length ?? 0) > 0;

    if (!hasCatchingGuilds) {
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
      title={t("window.title")}
      onClose={handleClose}
      variant="small"
      resizable={false}
      minWidth={400}
      minHeight={240}
      dynamicHeight
    >
      <div className="ll:p-4 ll:flex ll:flex-col ll:gap-4">
        <div className="ll:text-sm ll:text-gray-200">
          <p className="ll:mb-3">{t("content.title")}</p>
          <p className="ll:mb-3">{t("content.description")}</p>
        </div>
        <div className="ll:flex ll:gap-2 ll:justify-end">
          <Button onClick={handleClose} className="ll:px-3 ll:py-1">
            {t("common:actions.close")}
          </Button>
          <Button onClick={handleOpenSettings} className="ll:px-3 ll:py-1">
            {t("common:actions.openSettings")}
          </Button>
        </div>
      </div>
    </DraggableWindow>
  );
};
