import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { SettingsList } from "@/components/settings/settings-list";
import { SettingsListRow } from "@/components/settings/settings-list-row";
import { useTimersStore } from "@/store/timers.store";
import { RotateCcw } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type HiddenTimersProps = {
  guildId?: string;
};

export const HiddenTimers: FC<HiddenTimersProps> = ({ guildId }) => {
  const { hiddenTimers, revealTimer, generalConfig } = useTimersStore();
  const { t } = useTranslation();

  const key = generalConfig.timersGrouping ? "global" : guildId;
  const hiddenTimersForAccount = key ? hiddenTimers[key] : undefined;

  const uniqueHiddenTimers = Array.from(
    new Set(hiddenTimersForAccount ?? []),
  ).toSorted((a, b) => a.localeCompare(b));

  if (!key || uniqueHiddenTimers.length === 0) {
    return (
      <SettingsEmptyState>
        {t("settings.hiddenTimers.emptyState")}
      </SettingsEmptyState>
    );
  }

  return (
    <SettingsList>
      {uniqueHiddenTimers.map((timer) => (
        <SettingsListRow key={timer} title={timer}>
          <SettingsIconButton
            label={t("common:actions.restore")}
            onClick={() => revealTimer(key, timer)}
          >
            <RotateCcw aria-hidden="true" />
          </SettingsIconButton>
        </SettingsListRow>
      ))}
    </SettingsList>
  );
};
