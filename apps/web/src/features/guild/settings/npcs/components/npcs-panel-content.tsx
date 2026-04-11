import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import type { LootlogConfigNpc } from "@/hooks/api/guilds/use-guild-lootlog-settings";
import {
  ArrowLeft,
  Crown,
  Swords,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { NpcsForm } from "@/features/guild/settings/npcs/npcs-form";
import { useSelectorPanel } from "@/components/selector-panel";
import { ItemRarity } from "@/hooks/api/loots/use-loots";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";

const RARITY_CONFIG: {
  key: ItemRarity;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  label: string;
}[] = [
  {
    key: ItemRarity.LEGENDARY,
    color: "text-amber-700",
    bgColor: "bg-amber-700/10",
    icon: Crown,
    label: "Legendarny",
  },
  {
    key: ItemRarity.HEROIC,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    icon: Swords,
    label: "Heroiczny",
  },
  {
    key: ItemRarity.UNIQUE,
    color: "text-amber-300",
    bgColor: "bg-amber-300/10",
    icon: Sparkles,
    label: "Unikatowy",
  },
];

export const NpcsPanelContent: FC = () => {
  const { t } = useTranslation();
  const {
    selectedItem: selectedNpc,
    setSelectedItem: setSelectedNpc,
    isMobileDrawerOpen,
  } = useSelectorPanel<LootlogConfigNpc>();

  if (!selectedNpc) return null;

  const activeRarities = RARITY_CONFIG.filter((r) =>
    selectedNpc.allowedRarities.includes(r.key),
  );

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {!isMobileDrawerOpen && (
        <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-2">
          <button
            type="button"
            onClick={() => setSelectedNpc(null)}
            className="p-2 rounded-lg hover:bg-muted transition-colors mr-3"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold leading-tight truncate">
                {t(`npcType.${selectedNpc.npcType}`)}
              </h2>
              <p className="text-xs text-muted-foreground leading-tight">
                Konfiguruj zbierane przedmioty
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <TooltipProvider delayDuration={100}>
              {activeRarities.map((rarity) => {
                const IconComponent = rarity.icon;
                return (
                  <Tooltip key={rarity.key}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          rarity.bgColor,
                        )}
                      >
                        <IconComponent className={cn("size-4", rarity.color)} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="font-semibold text-sm">{rarity.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        </div>
      )}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <NpcsForm npc={selectedNpc} />
      </ScrollArea>
    </div>
  );
};
