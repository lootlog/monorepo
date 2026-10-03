import { SettingsTableCard } from "@/features/guild/settings/components/settings-table-card";
import { NpcsTable } from "@/features/guild/settings/npcs/npcs-table";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  useLootlogConfigControllerGetLootlogConfig,
  NpcType,
} from "@lootlog/client/main";

import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { Settings2 } from "lucide-react";
import { startTransition, useState } from "react";
import { useTranslation } from "react-i18next";

export const NpcsSettingsContent = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();

  const { data: config } = useLootlogConfigControllerGetLootlogConfig({
    guildId: guildId ?? "",
  });

  const [searchValue, setSearchValue] = useState("");
  const isMobile = useIsMobile();
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

  return (
    <SettingsTableCard
      title={t("settings.npcs.title")}
      search={{
        value: searchValue,
        placeholder: t("settings.npcs.searchPlaceholder"),
        onChange: setSearchValue,
      }}
      isEmpty={filteredNpcs.length === 0}
      empty={{
        icon: Settings2,
        title:
          config?.npcs?.length === 0
            ? t("settings.npcs.emptyGuildTitle")
            : t("settings.npcs.emptyTitle"),
        description: hasActiveFilters
          ? t("settings.npcs.emptyFilteredDescription")
          : t("settings.npcs.emptyDescription"),
      }}
      hasActiveFilters={hasActiveFilters}
      onResetFilters={() => startTransition(() => setSearchValue(""))}
    >
      <NpcsTable
        guildId={guildId ?? ""}
        isMobile={isMobile}
        npcs={filteredNpcs}
      />
    </SettingsTableCard>
  );
};
