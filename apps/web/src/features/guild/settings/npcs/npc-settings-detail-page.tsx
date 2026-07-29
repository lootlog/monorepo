import { NPC_RARITY_CONFIG } from "@/features/guild/settings/npcs/npc-rarity-config";
import { NpcsForm } from "@/features/guild/settings/npcs/npcs-form";
import { useLootlogConfigControllerGetLootlogConfig } from "@lootlog/api-client/react-query/main/lootlog-config";
import { cn } from "@/utils/cn";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export const NpcSettingsDetailPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { guildId, npcId } = useParams({
    from: "/_authenticated/$guildId/settings/npcs_/$npcId",
  });
  const { data: config } = useLootlogConfigControllerGetLootlogConfig({
    guildId,
  });
  const npc = config?.npcs?.find((item) => String(item.id) === npcId) ?? null;
  const handleBack = () => {
    navigate({
      to: "/$guildId/settings/npcs",
      params: { guildId },
    });
  };

  if (config && !npc) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background">
        <header className="shrink-0 border-b border-border bg-background px-4 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="size-4" />
            {t("settings.npcs.backToNpcs")}
          </Button>
        </header>
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="max-w-sm text-muted-foreground">
            <Settings2 className="mx-auto mb-3 size-10 opacity-50" />
            <p className="text-sm font-medium text-foreground">
              {t("settings.npcs.npcNotFound")}
            </p>
            <p className="mt-1 text-xs">
              {t("settings.npcs.npcNotFoundDescription")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!npc) {
    return null;
  }

  const enabledRarities = NPC_RARITY_CONFIG.filter((rarity) =>
    npc.allowedRarities.includes(rarity.key),
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 bg-background px-3">
      <Card className="shrink-0 border-b border-t border-border px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleBack}
              aria-label={t("settings.npcs.backToNpcs")}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings2 className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {t("settings.npcs.details")}
              </p>
              <h2 className="truncate text-base font-semibold leading-tight">
                {t(`npcType.${npc.npcType}`)}
              </h2>
            </div>
          </div>
          <div className="flex min-h-8 shrink-0 flex-wrap items-center gap-1 pl-12 sm:pl-0">
            {enabledRarities.length > 0 ? (
              <TooltipProvider delayDuration={100}>
                {enabledRarities.map((rarity) => {
                  const Icon = rarity.icon;

                  return (
                    <Tooltip key={rarity.key}>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            "inline-flex size-8 items-center justify-center rounded-md",
                            rarity.bgColor,
                          )}
                        >
                          <Icon className={cn("size-4", rarity.color)} />
                        </span>
                      </TooltipTrigger>
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
              <span className="text-xs text-muted-foreground">
                {t("settings.npcs.noRarities")}
              </span>
            )}
          </div>
        </div>
      </Card>
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto w-full">
          <NpcsForm npc={npc} />
        </div>
      </ScrollArea>
    </div>
  );
};
