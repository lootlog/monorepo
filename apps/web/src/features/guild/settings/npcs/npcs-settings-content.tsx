import { SearchInput } from "@/components/ui/search-input";
import { NpcsSettingsHeader } from "@/features/guild/settings/npcs/npcs-settings-header";
import { NpcsTable } from "@/features/guild/settings/npcs/npcs-table";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useLootlogConfigControllerGetLootlogConfig } from "@lootlog/api-client/react-query/main/lootlog-config";
import { NpcType } from "@lootlog/api-client/models/main/npc-type";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { FilterX, Settings2 } from "lucide-react";
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background px-3 gap-3">
      <NpcsSettingsHeader />
      <Card className="p-0 gap-0">
        <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t("settings.npcs.searchPlaceholder")}
            className="h-9"
            wrapperClassName="w-full xl:max-w-md 2xl:max-w-xl"
          />
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="h-full flex-1">
              <div className="w-full max-w-full min-w-0">
                {filteredNpcs.length > 0 && (
                  <NpcsTable
                    guildId={guildId ?? ""}
                    isMobile={isMobile}
                    npcs={filteredNpcs}
                  />
                )}
                {filteredNpcs.length === 0 && (
                  <div className="flex min-h-80 flex-col items-center justify-center px-4 py-12 text-center text-muted-foreground">
                    <Settings2 className="mb-4 size-12 opacity-30" />
                    <p className="text-sm font-medium">
                      {config?.npcs?.length === 0
                        ? t("settings.npcs.emptyGuildTitle")
                        : t("settings.npcs.emptyTitle")}
                    </p>
                    <p className="mt-1 text-xs">
                      {hasActiveFilters
                        ? t("settings.npcs.emptyFilteredDescription")
                        : t("settings.npcs.emptyDescription")}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-4"
                        onClick={() =>
                          startTransition(() => setSearchValue(""))
                        }
                      >
                        <FilterX className="size-4" />
                        {t("settings.npcs.resetFilters")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </Card>
    </div>
  );
};
