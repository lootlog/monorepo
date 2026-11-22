import { SettingsEmptyState } from "@/features/settings/components/shared/settings-empty-state";
import { SettingsRow } from "@/features/settings/components/shared/settings-row";
import { SettingsSection } from "@/features/settings/components/shared/settings-section";
import { SettingsTabLayout } from "@/features/settings/components/shared/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { useAccountEnabledFlag } from "@/lib/settings-persistence/use-account-enabled-flag";
import {
  useCurrentGameAccountPreferences,
  useUpdateGameAccountPreferences,
} from "@/lib/settings-persistence/use-game-account-preferences";
import { useGameStore } from "@/store/game.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export const PingsSettingsTab: FC = () => {
  const gameInterface = useGameStore((state) => state.game?.interface);
  const { t } = useTranslation();
  const { data: accountPreferences } = useCurrentGameAccountPreferences();
  const updateAccountPreferences = useUpdateGameAccountPreferences();
  const battlePings = useAccountEnabledFlag("battlePings");

  return (
    <SettingsTabLayout>
      <SettingsSection title={t("pings.settings.sectionTitle")}>
        {gameInterface === "ni" ? (
          <>
            <SettingsRow
              controlId="map-pings"
              htmlFor="map-pings"
              label={t("pings.settings.mapLabel")}
              description={t("pings.settings.mapDescription")}
            >
              <Switch
                checked={accountPreferences?.pings.enabled ?? false}
                disabled={!accountPreferences}
                onCheckedChange={(enabled) => {
                  updateAccountPreferences.mutate({ pings: { enabled } });
                }}
                id="map-pings"
              />
            </SettingsRow>
            <SettingsRow
              controlId="air-tag-minimap"
              htmlFor="air-tag-minimap"
              label={t("settings.airTags.minimapLabel")}
              description={t("settings.airTags.minimapDescription")}
            >
              <Switch
                checked={accountPreferences?.airTags.minimap ?? false}
                disabled={!accountPreferences}
                onCheckedChange={(minimap) => {
                  updateAccountPreferences.mutate({ airTags: { minimap } });
                }}
                id="air-tag-minimap"
              />
            </SettingsRow>
            <SettingsRow
              controlId="battle-pings"
              htmlFor="battle-pings"
              label={t("pings.settings.battleLabel")}
              description={t("pings.settings.battleDescription")}
            >
              <Switch
                checked={battlePings.data?.enabled ?? false}
                disabled={!battlePings.data}
                onCheckedChange={battlePings.setEnabled}
                id="battle-pings"
              />
            </SettingsRow>
          </>
        ) : (
          <SettingsEmptyState>
            {t("pings.settings.newInterfaceOnly")}
          </SettingsEmptyState>
        )}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
