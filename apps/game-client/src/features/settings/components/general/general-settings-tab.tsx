import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { recordRecentlyChanged } from "@/features/settings/recently-changed.store";
import { useSettingsStore } from "@/store/settings.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  useCurrentGameAccountPreferences,
  useUpdateGameAccountPreferences,
} from "@/features/settings/persistence/use-game-account-preferences";
import { useGameStore } from "@/store/game.store";

export const GeneralSettingsTab: FC = () => {
  const gameInterface = useGameStore((state) => state.game?.interface);

  const {
    allowWorldSelection,
    animationEffectsEnabled,
    toggleAllowWorldSelection,
    toggleAnimationEffects,
  } = useSettingsStore();

  const { t } = useTranslation();

  const { data: accountPreferences } = useCurrentGameAccountPreferences();

  const updateAccountPreferences = useUpdateGameAccountPreferences();

  return (
    <SettingsTabLayout
      title={t("settings.general.title")}
      description={t("settings.general.description")}
    >
      <SettingsSection title={t("settings.general.behaviorTitle")}>
        <SettingsRow
          controlId="allow-world-selection"
          label={t("settings.general.allowWorldSelectionLabel")}
          description={t("settings.general.allowWorldSelectionDescription")}
        >
          <Switch
            checked={allowWorldSelection}
            onCheckedChange={() => {
              recordRecentlyChanged("allow-world-selection");
              toggleAllowWorldSelection();
            }}
            id="allow-world-selection"
          />
        </SettingsRow>
        {gameInterface === "ni" ? (
          <>
            <SettingsRow
              controlId="map-pings"
              label={t("settings.general.mapPingsLabel")}
              description={t("settings.general.mapPingsDescription")}
            >
              <Switch
                checked={accountPreferences?.pings.enabled ?? false}
                disabled={
                  !accountPreferences || updateAccountPreferences.isPending
                }
                onCheckedChange={(enabled) => {
                  recordRecentlyChanged("map-pings");
                  updateAccountPreferences.mutate({ pings: { enabled } });
                }}
                id="map-pings"
              />
            </SettingsRow>
            <SettingsRow
              controlId="air-tags"
              label={t("settings.general.airTagsLabel")}
              description={t("settings.general.airTagsDescription")}
            >
              <Switch
                checked={accountPreferences?.airTags?.enabled ?? false}
                disabled={
                  !accountPreferences || updateAccountPreferences.isPending
                }
                onCheckedChange={(enabled) => {
                  recordRecentlyChanged("air-tags");
                  updateAccountPreferences.mutate({ airTags: { enabled } });
                }}
                id="air-tags"
              />
            </SettingsRow>
          </>
        ) : null}
        <SettingsRow
          controlId="animation-effects"
          label={t("settings.general.animationEffectsLabel")}
          description={t("settings.general.animationEffectsDescription")}
        >
          <Switch
            checked={animationEffectsEnabled}
            onCheckedChange={() => {
              recordRecentlyChanged("animation-effects");
              toggleAnimationEffects();
            }}
            id="animation-effects"
          />
        </SettingsRow>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
