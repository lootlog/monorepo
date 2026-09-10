import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTimersStore } from "@/store/timers.store";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";

const MAX_REMOVE_TIMER_AFTER_MS = 120000; // 2 minutes

export const TimersSettingsGeneral: FC = () => {
  const { generalConfig, setGeneralConfig } = useTimersStore();

  const { t } = useTranslation();

  const [inputValue, setInputValue] = useState<string>(() =>
    (generalConfig.removeTimerAfterMs / 1000).toString(),
  );

  const handleRemoveTimerAfterMsChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setInputValue(value);

    if (value === "") {
      setGeneralConfig({ ...generalConfig, removeTimerAfterMs: 0 });

      return;
    }

    const num = Number.parseInt(value, 10);

    if (Number.isNaN(num)) {
      setGeneralConfig({ ...generalConfig, removeTimerAfterMs: 0 });

      return;
    }

    if (num < 0 || num > MAX_REMOVE_TIMER_AFTER_MS / 1000) {
      setGeneralConfig({
        ...generalConfig,
        removeTimerAfterMs: MAX_REMOVE_TIMER_AFTER_MS,
      });
      setInputValue((MAX_REMOVE_TIMER_AFTER_MS / 1000).toString());

      return;
    }

    setGeneralConfig({ ...generalConfig, removeTimerAfterMs: num * 1000 });
  };

  return (
    <div className="ll:flex ll:flex-col ll:gap-[var(--ll-settings-space-xl)]">
      <SettingsSection
        controlId="timer-behavior"
        title={t("settings.timers.general.behaviorTitle")}
      >
        <SettingsRow
          label={t("settings.timers.general.groupingLabel")}
          description={t("settings.timers.general.groupingDescription")}
        >
          <Switch
            checked={generalConfig.timersGrouping}
            onCheckedChange={(value) =>
              setGeneralConfig({ ...generalConfig, timersGrouping: value })
            }
            id="timers-grouping"
          />
        </SettingsRow>
        <SettingsRow
          label={t("settings.timers.general.underBagLabel")}
          description={t("settings.timers.general.underBagDescription")}
        >
          <Switch
            checked={generalConfig.timersUnderBag}
            onCheckedChange={(value) =>
              setGeneralConfig({ ...generalConfig, timersUnderBag: value })
            }
            id="timers-under-bag"
          />
        </SettingsRow>
        <SettingsRow
          label={t("settings.timers.general.compactViewLabel")}
          description={t("settings.timers.general.compactViewDescription")}
        >
          <Switch
            checked={generalConfig.compactView}
            onCheckedChange={(value) =>
              setGeneralConfig({ ...generalConfig, compactView: value })
            }
            id="compact-view"
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title={t("settings.timers.general.countdownTitle")}>
        <SettingsRow
          controlId="timer-countdown"
          label={t("settings.timers.general.countdownLabel")}
          description={t("settings.timers.general.countdownDescription")}
          controlClassName="ll:w-28"
        >
          <ToggleGroup
            className="ll:ml-auto"
            variant="outline"
            size="sm"
            spacing={0}
            onValueChange={([value]: ("min" | "max")[]) => {
              if (value) {
                setGeneralConfig({
                  ...generalConfig,
                  countdownMode: value,
                });
              }
            }}
            value={[generalConfig.countdownMode]}
          >
            <ToggleGroupItem value="max">
              {t("settings.timers.general.countdownMax")}
            </ToggleGroupItem>
            <ToggleGroupItem value="min" className="ll:text-nowrap">
              {t("settings.timers.general.countdownMin")}
            </ToggleGroupItem>
          </ToggleGroup>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title={t("settings.timers.general.fadeTitle")}>
        <SettingsRow
          label={t("settings.timers.general.removeTimerAfterLabel")}
          description={t("settings.timers.general.removeTimerAfterDescription")}
          controlClassName="ll:w-10"
        >
          <Input
            type="text"
            value={inputValue}
            max={120}
            onChange={handleRemoveTimerAfterMsChange}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
};
