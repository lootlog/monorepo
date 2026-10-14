import { ListToolbar } from "@/components/common/list-toolbar";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  useLootlogConfigControllerGetLootlogConfig,
  NpcType,
} from "@lootlog/client/main";
import { SearchX, Settings2 } from "lucide-react";
import { startTransition, useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsClearFilterButton } from "../components/settings-clear-filter-button";
import { SettingsListEmpty } from "../components/settings-list-empty";
import { SettingsListError } from "../components/settings-list-error";
import { SettingsTabPage } from "../components/settings-tab-page";
import { NpcTile } from "./npc-tile";

export const NpcsSettingsContent = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";

  const {
    data: config,
    isError,
    isFetching,
    refetch,
  } = useLootlogConfigControllerGetLootlogConfig({ guildId });

  const [searchValue, setSearchValue] = useState("");
  const normalizedSearchValue = searchValue.trim().toLowerCase();

  const filteredNpcs = (config?.npcs ?? [])
    .filter(
      (npc) =>
        npc.npcType !== NpcType.COMMON &&
        t(`npcType.${npc.npcType}`)
          .toLowerCase()
          .includes(normalizedSearchValue),
    )
    .sort((firstNpc, secondNpc) =>
      t(`npcType.${firstNpc.npcType}`).localeCompare(
        t(`npcType.${secondNpc.npcType}`),
      ),
    );

  const configuredNpcs = (config?.npcs ?? []).filter(
    (npc) => npc.npcType !== NpcType.COMMON,
  );

  const renderContent = () => {
    if (!config && isError) {
      return (
        <SettingsListError
          title={t("settings.npcs.empty.loadError")}
          isRetrying={isFetching}
          onRetry={() => void refetch()}
        />
      );
    }

    if (!config) {
      return (
        <div aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <ListTileSkeleton key={index} media="none" />
          ))}
        </div>
      );
    }

    if (configuredNpcs.length === 0) {
      return (
        <SettingsListEmpty
          icon={Settings2}
          title={t("settings.npcs.empty.title")}
          description={t("settings.npcs.empty.description")}
        />
      );
    }

    if (filteredNpcs.length === 0) {
      return (
        <SettingsListEmpty
          icon={SearchX}
          title={t("settings.npcs.empty.filteredTitle", {
            query: searchValue.trim(),
          })}
          description={t("settings.npcs.empty.filteredDescription")}
          action={
            <SettingsClearFilterButton
              onClear={() => startTransition(() => setSearchValue(""))}
            />
          }
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
        disabled={configuredNpcs.length === 0}
      />
      {renderContent()}
    </SettingsTabPage>
  );
};
