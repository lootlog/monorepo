import { Card } from "@lootlog/ui/components/card";
import { cn } from "@lootlog/ui/lib/utils";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Crown,
  Swords,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { FC } from "react";
import type { LootlogConfigNpc } from "@/hooks/api/guilds/use-guild-lootlog-settings";
import { useTranslation } from "react-i18next";
import { useSelectorPanel } from "@/components/selector-panel";
import { ItemRarity } from "@/hooks/api/loots/use-loots";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";

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

export type NpcListItemProps = {
  npc: LootlogConfigNpc;
  index: number;
};

export const NpcListItem: FC<NpcListItemProps> = ({ npc, index }) => {
  const { t } = useTranslation();
  const { selectedItem, handleSelect } = useSelectorPanel<LootlogConfigNpc>();

  const isSelected = selectedItem?.id === npc.id;

  const activeRarities = RARITY_CONFIG.filter((r) =>
    npc.allowedRarities.includes(r.key),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.04,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Card
        className={cn(
          "group relative overflow-hidden cursor-pointer transition-all duration-150",
          "bg-card/40 backdrop-blur-sm border-border",
          "hover:bg-card/80 hover:border-primary/30 hover:shadow-lg hover:scale-[1.01] py-1",
          isSelected &&
            "bg-primary/10 border-primary/50 shadow-lg scale-[1.01]",
        )}
        onClick={() => handleSelect(npc)}
      >
        <div className="flex flex-wrap items-center gap-3 py-2 px-4 pl-5">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {t(`npcType.${npc.npcType}`)}
            </div>
          </div>
          <ChevronRight
            className={cn(
              "size-4 text-muted-foreground shrink-0 transition-all duration-150 hidden md:block",
              "absolute right-3 top-1/2 -translate-y-1/2",
              "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
              isSelected && "opacity-100 translate-x-0 text-primary",
            )}
          />
          <div className="flex items-center gap-1 md:mr-6">
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
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconComponent className={cn("size-4", rarity.color)} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="font-semibold text-sm">{rarity.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
