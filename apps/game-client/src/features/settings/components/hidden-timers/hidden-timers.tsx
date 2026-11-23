import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { SettingsList } from "@/features/settings/components/shared/settings-list";
import { SettingsListRow } from "@/features/settings/components/shared/settings-list-row";
import { GLOBAL_TIMER_SETTINGS_KEY } from "@/store/timer-settings-sync";
import { useTimersStore } from "@/store/timers.store";
import { RotateCcw } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type HiddenTimersProps = {
  guildId?: string;
};

export const HiddenTimers: FC<HiddenTimersProps> = ({ guildId }) => {
  const hiddenTimers = useTimersStore((state) => state.hiddenTimers);
  const revealTimer = useTimersStore((state) => state.revealTimer);

  const timersGrouping = useTimersStore(
    (state) => state.generalConfig.timersGrouping,
  );

  const { t } = useTranslation();

  const key = timersGrouping ? GLOBAL_TIMER_SETTINGS_KEY : guildId;
  const hiddenTimersForAccount = key ? hiddenTimers[key] : undefined;

  const uniqueHiddenTimers = Array.from(
    new Set(hiddenTimersForAccount ?? []),
  ).sort((a, b) => a.localeCompare(b));

  if (!key || uniqueHiddenTimers.length === 0) {
    return <EmptyState description={t("settings.hiddenTimers.emptyState")} />;
  }

  return (
    <SettingsList>
      {uniqueHiddenTimers.map((timer) => (
        <SettingsListRow key={timer} title={timer}>
          <IconButton
            label={t("common:actions.restore")}
            onClick={() => revealTimer(key, timer)}
          >
            <RotateCcw aria-hidden="true" />
          </IconButton>
        </SettingsListRow>
      ))}
    </SettingsList>
  );
};
