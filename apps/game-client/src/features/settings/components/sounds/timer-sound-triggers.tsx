import { Switch } from "@/components/ui/switch";
import { SettingsNumberField } from "@/features/settings/components/shared/settings-number-field";
import { SettingsRow } from "@/features/settings/components/shared/settings-row";
import {
  useUpdateSoundSettings,
  type TimerSoundSettings,
} from "@/lib/settings-persistence/use-sound-settings";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type TimerSoundTriggersProps = {
  settings: TimerSoundSettings | undefined;
};

const TRIGGERS = [
  { key: "timerWindowSoonSound", id: "timer-sound-window-soon" },
  { key: "timerWindowOpenSound", id: "timer-sound-window-open" },
  { key: "timerWindowEndSound", id: "timer-sound-window-end" },
] as const;

export const TimerSoundTriggers: FC<TimerSoundTriggersProps> = ({
  settings,
}) => {
  const { t } = useTranslation();
  const { mutate: updateSettings } = useUpdateSoundSettings();
  const minutes = settings?.timerWindowSoonMinutes ?? 5;

  return (
    <>
      {TRIGGERS.map((trigger) => (
        <SettingsRow
          key={trigger.key}
          htmlFor={trigger.id}
          label={t(`settings.sounds.timerTriggers.${trigger.key}.label`, {
            minutes,
          })}
          description={t(
            `settings.sounds.timerTriggers.${trigger.key}.description`,
            { minutes },
          )}
        >
          <Switch
            id={trigger.id}
            checked={settings?.[trigger.key] ?? false}
            onCheckedChange={(checked) =>
              updateSettings({ [trigger.key]: checked })
            }
          />
        </SettingsRow>
      ))}
      <SettingsRow
        htmlFor="timer-sound-window-soon-minutes"
        label={t("settings.sounds.timerTriggers.minutesLabel")}
        description={t("settings.sounds.timerTriggers.minutesDescription")}
        disabled={!settings?.timerWindowSoonSound}
      >
        <SettingsNumberField
          id="timer-sound-window-soon-minutes"
          value={minutes}
          min={1}
          max={60}
          unit="min"
          disabled={!settings?.timerWindowSoonSound}
          onCommit={(value) =>
            updateSettings({ timerWindowSoonMinutes: value })
          }
        />
      </SettingsRow>
    </>
  );
};
