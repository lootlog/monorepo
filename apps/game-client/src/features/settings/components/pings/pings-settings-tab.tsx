import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { useBattlePingPreferences } from "@/features/settings/persistence/use-battle-ping-preferences";
import {
  useCurrentGameAccountPreferences,
  useUpdateGameAccountPreferences,
} from "@/features/settings/persistence/use-game-account-preferences";
import { useGameStore } from "@/store/game.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

/** Map and battle pings; both depend on the new game interface. */
export const PingsSettingsTab: FC = () => {
  const gameInterface = useGameStore((state) => state.game?.interface);
  const { t } = useTranslation();
  const { data: accountPreferences } = useCurrentGameAccountPreferences();
  const updateAccountPreferences = useUpdateGameAccountPreferences();
  const battlePings = useBattlePingPreferences();

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
                disabled={
                  !accountPreferences || updateAccountPreferences.isPending
                }
                onCheckedChange={(enabled) => {
                  updateAccountPreferences.mutate({ pings: { enabled } });
                }}
                id="map-pings"
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
                disabled={!battlePings.data || battlePings.isPending}
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
