import { TableFilterToolbar } from "@/components/ui/table-filter-toolbar";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SearchInput } from "@/components/ui/search-input";
import { NpcsTable } from "@/features/guild/settings/npcs/npcs-table";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useLootlogConfigControllerGetLootlogConfig } from "@lootlog/client/main";
import { NpcType } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";

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
    <div className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-background px-3 pb-3 gap-3">
      <h1 className="sr-only">{t("settings.npcs.title")}</h1>
      <SectionCard className="max-h-full shrink-0">
        <SectionCardContent className="flex min-h-0 flex-col gap-0 p-0">
          <TableFilterToolbar>
            <SearchInput
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={t("settings.npcs.searchPlaceholder")}
              className="h-9"
              wrapperClassName="w-full min-w-0 sm:min-w-[200px] sm:flex-1"
            />
          </TableFilterToolbar>

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
        </SectionCardContent>
      </SectionCard>
    </div>
  );
};
