import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/store/settings.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useCurrentGameAccountPreferences } from "@/hooks/use-current-game-account-preferences";
import { useUpdateUserGameAccountPreferences } from "@/hooks/api/use-user-account-preferences";
import { Game } from "@/lib/game";

export const GeneralSettingsTab: FC = () => {
  const {
    allowWorldSelection,
    animationEffectsEnabled,
    toggleAllowWorldSelection,
    toggleAnimationEffects,
  } = useSettingsStore();
  const { t } = useTranslation();
  const { accountId, data: accountPreferences } =
    useCurrentGameAccountPreferences();
  const updateAccountPreferences =
    useUpdateUserGameAccountPreferences(accountId);

  return (
    <SettingsTabLayout
      title={t("settings.general.title")}
      description={t("settings.general.description")}
    >
      <SettingsSection title={t("settings.general.behaviorTitle")}>
        <SettingsControlRow
          label={t("settings.general.allowWorldSelectionLabel")}
          description={t("settings.general.allowWorldSelectionDescription")}
        >
          <Switch
            checked={allowWorldSelection}
            onCheckedChange={toggleAllowWorldSelection}
            id="allow-world-selection"
          />
        </SettingsControlRow>
        {Game.interface === "ni" ? (
          <>
            <SettingsControlRow
              label={t("settings.general.mapPingsLabel")}
              description={t("settings.general.mapPingsDescription")}
            >
              <Switch
                checked={accountPreferences?.pings.enabled ?? false}
                disabled={
                  !accountPreferences || updateAccountPreferences.isPending
                }
                onCheckedChange={(enabled) =>
                  updateAccountPreferences.mutate({ pings: { enabled } })
                }
                id="map-pings"
              />
            </SettingsControlRow>
            <SettingsControlRow
              label={t("settings.general.airTagsLabel")}
              description={t("settings.general.airTagsDescription")}
            >
              <Switch
                checked={accountPreferences?.airTags?.enabled ?? false}
                disabled={
                  !accountPreferences || updateAccountPreferences.isPending
                }
                onCheckedChange={(enabled) =>
                  updateAccountPreferences.mutate({ airTags: { enabled } })
                }
                id="air-tags"
              />
            </SettingsControlRow>
          </>
        ) : null}
        <SettingsControlRow
          label={t("settings.general.animationEffectsLabel")}
          description={t("settings.general.animationEffectsDescription")}
        >
          <Switch
            checked={animationEffectsEnabled}
            onCheckedChange={toggleAnimationEffects}
            id="animation-effects"
          />
        </SettingsControlRow>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
