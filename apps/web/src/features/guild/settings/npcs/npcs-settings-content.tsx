import { ListToolbar } from "@/components/common/list-toolbar";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  useLootlogConfigControllerGetLootlogConfig,
  NpcType,
} from "@lootlog/client/main";
import { Settings2 } from "lucide-react";
import { startTransition, useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsListEmpty } from "../components/settings-list-empty";
import { SettingsTabPage } from "../components/settings-tab-page";
import { NpcTile } from "./npc-tile";

export const NpcsSettingsContent = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";

  const { data: config } = useLootlogConfigControllerGetLootlogConfig({
    guildId,
  });

  const [searchValue, setSearchValue] = useState("");
  const normalizedSearchValue = searchValue.trim().toLowerCase();

  const filteredNpcs = [...(config?.npcs ?? [])]
    .filter((npc) => {
      const npcName = t(`npcType.${npc.npcType}`).toLowerCase();

      return (
        npc.npcType !== NpcType.COMMON &&
        npcName.includes(normalizedSearchValue)
      );
    })
    .sort((firstNpc, secondNpc) =>
      t(`npcType.${firstNpc.npcType}`).localeCompare(
        t(`npcType.${secondNpc.npcType}`),
      ),
    );

  const hasActiveFilters = normalizedSearchValue !== "";

  const renderContent = () => {
    if (!config) {
      return (
        <div aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <ListTileSkeleton key={index} media="none" />
          ))}
        </div>
      );
    }

    if (filteredNpcs.length === 0) {
      return (
        <SettingsListEmpty
          icon={Settings2}
          title={
            config.npcs?.length === 0
              ? t("settings.npcs.emptyGuildTitle")
              : t("settings.npcs.emptyTitle")
          }
          description={
            hasActiveFilters
              ? t("settings.npcs.emptyFilteredDescription")
              : t("settings.npcs.emptyDescription")
          }
          hasActiveFilters={hasActiveFilters}
          onResetFilters={() => startTransition(() => setSearchValue(""))}
        />
      );
    }

    return filteredNpcs.map((npc) => (
      <NpcTile key={npc.id} guildId={guildId} npc={npc} />
    ));
  };

  return (
    <SettingsTabPage title={t("settings.npcs.title")}>
      <ListToolbar
        search={searchValue}
        onSearchChange={setSearchValue}
        placeholder={t("settings.npcs.searchPlaceholder")}
        label={t("settings.npcs.searchPlaceholder")}
        clearLabel={t("settings.clearFilter")}
        disabled={!config}
      />
      {renderContent()}
    </SettingsTabPage>
  );
};
