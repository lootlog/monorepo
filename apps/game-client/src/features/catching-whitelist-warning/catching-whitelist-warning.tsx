import { UsersRound } from "lucide-react";
import { useEffect, useRef, type FC } from "react";
import { useTranslation } from "react-i18next";
import { WarningWindow } from "@/components/warning-window/warning-window";
import { SettingsGuildPicker } from "@/features/settings/components/shared/settings-guild-picker";
import { useSetupChecklist } from "@/features/setup-checklist/use-setup-checklist";
import { useCharacterCatchingSelection } from "@/hooks/use-character-catching-selection";
import { useConfirmedCatchingCharacters } from "@/hooks/use-confirmed-catching-characters";
import { useGameStore } from "@/store/game.store";
import { useWindowsStore } from "@/store/windows.store";

/**
 * Asks once per character which Lootlogs it plays for: its loot, timers and
 * presence go there, and it sees other players only in those Lootlogs. It
 * comes up as soon as the character's Lootlogs are known, once no other notice
 * window is open; picking here also completes the first-run checklist step.
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

  const { steps } = useSetupChecklist();

  const catchingStatus = steps.find((step) => step.id === "catching")?.status;

  const characterId = useGameStore(
    (state) => state.game?.hero.characterId ?? "",
  );

  const { isConfirmed, confirm } = useConfirmedCatchingCharacters();

  const { guilds, selectedGuildIds, toggle, isConfigLoading } =
    useCharacterCatchingSelection(characterId);

  const checkedCharacterIdsRef = useRef(new Set<string>());
  const confirmed = isConfirmed(characterId);

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

    // Decided once per character and session, so a choice made in the
    // settings while the window is closed does not bring it back.
    checkedCharacterIdsRef.current.add(characterId);

    if (!confirmed) setOpen("catching-whitelist-warning", true);
  }, [catchingStatus, characterId, confirmed, otherNoticeOpen, setOpen]);

  const handleClose = () => {
    confirm(characterId);
    setOpen("catching-whitelist-warning", false);
  };

  return (
    <WarningWindow
      id="catching-whitelist-warning"
      open={open}
      title={t("window.title")}
      icon={UsersRound}
      heading={t("content.title")}
      description={t("content.description")}
      primaryAction={{ label: t("actions.done"), onClick: handleClose }}
      onClose={handleClose}
    >
      <div className="ll:flex ll:flex-col ll:gap-2 ll:px-3 ll:pb-3">
        <SettingsGuildPicker
          aria-label={t("content.pickerLabel")}
          guilds={guilds}
          selectedGuildIds={selectedGuildIds}
          disabled={isConfigLoading}
          onToggle={toggle}
        />
        <p className="ll:m-0 ll:text-xs ll:leading-4 ll:text-muted-foreground ll:text-pretty">
          {t("content.settingsHint")}
        </p>
      </div>
    </WarningWindow>
  );
};
