import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import {
  useCurrentGameAccountPreferences,
  useUpdateGameAccountPreferences,
} from "@/features/settings/persistence/use-game-account-preferences";
import { recordRecentlyChanged } from "@/features/settings/recently-changed.store";
import { useGameStore } from "@/store/game.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

/** Features still under test; they depend on the new game interface. */
export const ExperimentalSettingsTab: FC = () => {
  const gameInterface = useGameStore((state) => state.game?.interface);
  const { t } = useTranslation();
  const { data: accountPreferences } = useCurrentGameAccountPreferences();
  const updateAccountPreferences = useUpdateGameAccountPreferences();

  const controlsDisabled =
    !accountPreferences || updateAccountPreferences.isPending;

  return (
    <SettingsTabLayout>
      <SettingsSection
        title={t("settings.experimental.sectionTitle")}
        description={t("settings.experimental.sectionDescription")}
      >
        {gameInterface === "ni" ? (
          <>
            <SettingsRow
              controlId="map-pings"
              label={t("settings.experimental.mapPingsLabel")}
              description={t("settings.experimental.mapPingsDescription")}
            >
              <Switch
                checked={accountPreferences?.pings.enabled ?? false}
                disabled={controlsDisabled}
                onCheckedChange={(enabled) => {
                  recordRecentlyChanged("map-pings");
                  updateAccountPreferences.mutate({ pings: { enabled } });
                }}
                id="map-pings"
              />
            </SettingsRow>
            <SettingsRow
              controlId="air-tags"
              label={t("settings.experimental.airTagsLabel")}
              description={t("settings.experimental.airTagsDescription")}
            >
              <Switch
                checked={accountPreferences?.airTags?.enabled ?? false}
                disabled={controlsDisabled}
                onCheckedChange={(enabled) => {
                  recordRecentlyChanged("air-tags");
                  updateAccountPreferences.mutate({ airTags: { enabled } });
                }}
                id="air-tags"
              />
            </SettingsRow>
          </>
        ) : (
          <SettingsEmptyState>
            {t("settings.experimental.newInterfaceOnly")}
          </SettingsEmptyState>
        )}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
