import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { GuildSelect } from "@/components/guild-select";
import { HiddenTimers } from "@/features/settings/components/hidden-timers/hidden-timers";
import { useTimersStore } from "@/store/timers.store";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";

export const HiddenTimersTab = () => {
  const { generalConfig } = useTimersStore();

  const {
    guildsQuery: { isFetched },
    orderedGuilds: guilds,
  } = useLootlogGuilds();

  const [requestedGuildId, setRequestedGuildId] = useState("");
  const { t } = useTranslation();

  const requestedGuildExists = guilds.some(
    (guild) => guild.id === requestedGuildId,
  );

  let selectedGuildId = "";

  if (!generalConfig.timersGrouping && isFetched) {
    selectedGuildId = requestedGuildExists
      ? requestedGuildId
      : (guilds[0]?.id ?? "");
  }

  return (
    <SettingsTabLayout>
      {!generalConfig.timersGrouping ? (
        <SettingsSection title={t("settings.hiddenTimers.scopeTitle")}>
          {guilds.length > 0 ? (
            <SettingsRow
              htmlFor="hidden-timers-guild"
              label={t("settings.hiddenTimers.guildLabel")}
              description={t("settings.hiddenTimers.ungroupedDescription")}
              control="wide"
            >
              <GuildSelect
                id="hidden-timers-guild"
                guilds={guilds}
                value={selectedGuildId}
                onValueChange={setRequestedGuildId}
              />
            </SettingsRow>
          ) : (
            <SettingsEmptyState>
              {t("settings.hiddenTimers.emptyGuilds")}
            </SettingsEmptyState>
          )}
        </SettingsSection>
      ) : null}
      <SettingsSection
        controlId="hidden-timers-list"
        title={t("settings.hiddenTimers.listTitle")}
      >
        <HiddenTimers guildId={selectedGuildId} />
      </SettingsSection>
    </SettingsTabLayout>
  );
};
