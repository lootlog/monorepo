import { SettingsGuildSelectionGrid } from "@/features/settings/components/shared/settings-guild-selection-grid";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { HiddenTimers } from "@/features/settings/components/hidden-timers/hidden-timers";
import { useGuilds } from "@/hooks/api/use-guilds";
import { useTimersStore } from "@/store/timers.store";
import { useEffect, useState } from "react";

export const HiddenTimersTab = () => {
  const { generalConfig } = useTimersStore();
  const { data: guilds, isFetched } = useGuilds();
  const [selectedGuildId, setSelectedGuildId] = useState("");

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
      title="Ukryte timery"
      description="Przywracaj ukryte timery i zarządzaj listą ukrytych wpisów."
    >
      <SettingsSection
        title="Zakres listy"
        description={
          generalConfig.timersGrouping
            ? "Grupowanie jest włączone, więc ustawienia działają globalnie bez podziału na serwer."
            : "Wybierz serwer, dla którego chcesz zobaczyć ukryte timery."
        }
      >
        {!generalConfig.timersGrouping ? (
          <div className="ll:w-full">
            <SettingsGuildSelectionGrid
              guilds={guilds}
              selectedGuildId={selectedGuildId}
              selectionMode="single"
              onSelect={setSelectedGuildId}
              emptyStateLabel="Brak gildii do wyboru."
              variant="compact"
            />
          </div>
        ) : null}
      </SettingsSection>
      <SettingsSection title="Ukryte timery">
        <HiddenTimers guildId={selectedGuildId} />
      </SettingsSection>
    </SettingsTabLayout>
  );
};
