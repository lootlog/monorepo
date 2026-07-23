import { SettingsGuildSelectionGrid } from "@/features/settings/components/shared/settings-guild-selection-grid";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { HiddenTimers } from "@/features/settings/components/hidden-timers/hidden-timers";
import { useTimersStore } from "@/store/timers.store";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/api-client/react-query/main/users";

export const HiddenTimersTab = () => {
  const { generalConfig } = useTimersStore();
  const { data: guilds, isFetched } =
    useUsersControllerGetCurrentUserAccessibleGuilds();
  const [selectedGuildId, setSelectedGuildId] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    if (generalConfig.timersGrouping || !isFetched) {
      return;
    }

    if (!guilds || guilds.length === 0) {
      setSelectedGuildId("");
      return;
    }

    const hasSelectedGuild = guilds.some(
      (guild) => guild.id === selectedGuildId,
    );

    if (!hasSelectedGuild) {
      setSelectedGuildId(guilds[0].id);
    }
  }, [generalConfig.timersGrouping, guilds, isFetched, selectedGuildId]);

  return (
    <SettingsTabLayout
      title={t("settings.hiddenTimers.title")}
      description={t("settings.hiddenTimers.description")}
    >
      <SettingsSection
        title={t("settings.hiddenTimers.scopeTitle")}
        description={
          generalConfig.timersGrouping
            ? t("settings.hiddenTimers.groupedDescription")
            : t("settings.hiddenTimers.ungroupedDescription")
        }
      >
        {!generalConfig.timersGrouping ? (
          <div className="ll:w-full">
            <SettingsGuildSelectionGrid
              guilds={guilds}
              selectedGuildId={selectedGuildId}
              selectionMode="single"
              onSelect={setSelectedGuildId}
              emptyStateLabel={t("settings.hiddenTimers.emptyGuilds")}
              variant="compact"
            />
          </div>
        ) : null}
      </SettingsSection>
      <SettingsSection title={t("settings.hiddenTimers.listTitle")}>
        <HiddenTimers guildId={selectedGuildId} />
      </SettingsSection>
    </SettingsTabLayout>
  );
};
