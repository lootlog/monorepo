import { PageHeader } from "@/components/common/page-header";
import { NPC_RARITY_CONFIG } from "@/features/guild/settings/npcs/npc-rarity-config";
import { NpcsForm } from "@/features/guild/settings/npcs/npcs-form";
import { useLootlogConfigControllerGetLootlogConfig } from "@lootlog/client/main";
import { cn } from "cn";
import { EmptyState } from "@/components/common/empty-state";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useParams } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export const NpcSettingsDetailPage = () => {
  const { t } = useTranslation();

  const { guildId, npcId } = useParams({
    from: "/_authenticated/$guildId/settings/npcs_/$npcId",
  });

  const { data: config } = useLootlogConfigControllerGetLootlogConfig({
    guildId,
  });

  const npc = config?.npcs?.find((item) => String(item.id) === npcId) ?? null;

  if (config && !npc) {
    return (
      <EmptyState
        icon={Settings2}
        title={t("settings.npcs.npcNotFound")}
        description={t("settings.npcs.npcNotFoundDescription")}
        className="h-full"
      />
    );
  }

  if (!npc) {
    return null;
  }

  const enabledRarities = NPC_RARITY_CONFIG.filter((rarity) =>
    npc.allowedRarities.includes(rarity.key),
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 custom-scrollbar [scrollbar-gutter:stable]">
      <PageHeader
        title={t(`npcType.${npc.npcType}`)}
        icon={Settings2}
        description={t("settings.npcs.details")}
        metadata={
          enabledRarities.length > 0 ? (
            <TooltipProvider delay={100}>
              {enabledRarities.map((rarity) => {
                const Icon = rarity.icon;

                return (
                  <Tooltip key={rarity.key}>
                    <TooltipTrigger
                      render={
                        <span
                          className={cn(
                            "inline-flex size-8 items-center justify-center rounded-md",
                            rarity.bgColor,
                          )}
                          aria-label={t(`itemRarity.${rarity.key}`)}
                        >
                          <Icon
                            className={cn("size-4", rarity.color)}
                            aria-hidden
                          />
                        </span>
                      }
                    />
                    <TooltipContent side="bottom">
                      <p className="text-sm font-semibold">
                        {t(`itemRarity.${rarity.key}`)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          ) : (
            t("settings.npcs.noRarities")
          )
        }
      />
      <ScrollArea className="min-h-48 flex-1">
        <div className="mx-auto w-full">
          <NpcsForm npc={npc} />
        </div>
      </ScrollArea>
    </div>
  );
};
