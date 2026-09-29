import { Schema } from "effect";
import { TriangleAlert } from "lucide-react";
import { useEffect, useRef, type FC } from "react";
import { useTranslation } from "react-i18next";
import { WarningWindow } from "@/components/warning-window/warning-window";
import { useSetupChecklist } from "@/features/setup-checklist/use-setup-checklist";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { storageKey } from "@/lib/storage-key";
import { useGameStore } from "@/store/game.store";
import { useWindowsStore } from "@/store/windows.store";

const dismissedCharactersSchema = Schema.Record(Schema.String, Schema.Boolean);

const STORAGE_KEY = storageKey("ll:catching-whitelist-warning-dismissed");

type DismissedCharacters = Record<string, boolean>;

const DEFAULT_DISMISSED_CHARACTERS: DismissedCharacters = {};

/**
 * Reminds a player whose character sends its loot and timers nowhere. It
 * reads the catching step of the first-run checklist, so it stays closed for
 * a signed-out player or one without any Lootlog. While the checklist is on
 * screen it already carries that step, so the reminder is only for players
 * who dismissed it, and it waits until no other notice window is open.
 */
export const CatchingWhitelistWarning: FC = () => {
  const { t } = useTranslation("catchingWhitelistWarning");

  const open = useWindowsStore(
    (state) => state["catching-whitelist-warning"].open,
  );

  const otherNoticeOpen = useWindowsStore(
    (state) => state["backend-preferences-warning"].open,
  );

  const setOpen = useWindowsStore((state) => state.setOpen);
  const openAndFocus = useWindowsStore((state) => state.openAndFocus);
  const { steps, dismissed: checklistDismissed } = useSetupChecklist();

  const catchingStatus = steps.find((step) => step.id === "catching")?.status;

  const characterId = useGameStore(
    (state) => state.game?.hero.characterId ?? "",
  );

  const [dismissedCharacters, setDismissedCharacters] =
    useLocalStorage<DismissedCharacters>(
      STORAGE_KEY,
      DEFAULT_DISMISSED_CHARACTERS,
      dismissedCharactersSchema,
    );

  const checkedCharacterIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (
      !characterId ||
      checkedCharacterIdsRef.current.has(characterId) ||
      catchingStatus === undefined ||
      catchingStatus === "pending" ||
      catchingStatus === "blocked" ||
      otherNoticeOpen
    )
      return;

    // Decided once per character, so dismissing the checklist later does not
    // bring this window up straight after.
    checkedCharacterIdsRef.current.add(characterId);

    if (
      catchingStatus === "todo" &&
      checklistDismissed &&
      !dismissedCharacters[characterId]
    )
      setOpen("catching-whitelist-warning", true);
  }, [
    catchingStatus,
    characterId,
    checklistDismissed,
    dismissedCharacters,
    otherNoticeOpen,
    setOpen,
  ]);

  const handleClose = () => {
    if (characterId) {
      setDismissedCharacters({
        ...dismissedCharacters,
        [characterId]: true,
      });
    }

    setOpen("catching-whitelist-warning", false);
  };

  const handleOpenSettings = () => {
    openAndFocus("settings", {
      activeTab: "catching",
      activeSubsection: "catching",
    });
    handleClose();
  };

  return (
    <WarningWindow
      id="catching-whitelist-warning"
      open={open}
      title={t("window.title")}
      icon={TriangleAlert}
      heading={t("content.title")}
      description={t("content.description")}
      primaryAction={{
        label: t("actions.chooseLootlogs"),
        onClick: handleOpenSettings,
      }}
      onClose={handleClose}
    />
  );
};
