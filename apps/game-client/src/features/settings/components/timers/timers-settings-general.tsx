import { SettingsNumberField } from "@/components/settings/settings-number-field";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTimersStore } from "@/store/timers.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

const MAX_REMOVE_TIMER_AFTER_SECONDS = 120;

export const TimersSettingsGeneral: FC = () => {
  const { generalConfig, setGeneralConfig } = useTimersStore();

  const { t } = useTranslation();

  return (
    <SettingsTabLayout>
      <SettingsSection
        controlId="timer-behavior"
        title={t("settings.timers.general.behaviorTitle")}
      >
        <SettingsRow
          htmlFor="timers-grouping"
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
          htmlFor="timers-under-bag"
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
          htmlFor="compact-view"
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
          htmlFor="timers-remove-after"
          label={t("settings.timers.general.removeTimerAfterLabel")}
          description={t("settings.timers.general.removeTimerAfterDescription")}
        >
          <SettingsNumberField
            id="timers-remove-after"
            min={0}
            max={MAX_REMOVE_TIMER_AFTER_SECONDS}
            unit="s"
            value={generalConfig.removeTimerAfterMs / 1000}
            onCommit={(seconds) =>
              setGeneralConfig({
                ...generalConfig,
                removeTimerAfterMs: seconds * 1000,
              })
            }
          />
        </SettingsRow>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
