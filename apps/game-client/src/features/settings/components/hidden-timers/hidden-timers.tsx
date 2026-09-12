import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { SettingsList } from "@/components/settings/settings-list";
import { SettingsListRow } from "@/components/settings/settings-list-row";
import { GLOBAL_TIMER_SETTINGS_KEY } from "@/features/timers/settings/timer-settings-documents";
import { setTimerHidden } from "@/features/timers/settings/timer-settings-writers";
import {
  useGuildTimerLists,
  useTimerBehaviorSettings,
} from "@/features/timers/settings/use-timer-settings";
import { RotateCcw } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type HiddenTimersProps = {
  guildId?: string;
};

export const HiddenTimers: FC<HiddenTimersProps> = ({ guildId }) => {
  const { generalConfig } = useTimerBehaviorSettings().behavior;
  const { t } = useTranslation();

  const key = generalConfig.timersGrouping
    ? GLOBAL_TIMER_SETTINGS_KEY
    : guildId;

  const { hiddenTimers } = useGuildTimerLists(key ?? "");

  const uniqueHiddenTimers = Array.from(new Set(hiddenTimers)).toSorted(
    (a, b) => a.localeCompare(b),
  );

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
            onClick={() => setTimerHidden(key, timer, false)}
          >
            <RotateCcw aria-hidden="true" />
          </SettingsIconButton>
        </SettingsListRow>
      ))}
    </SettingsList>
  );
};
