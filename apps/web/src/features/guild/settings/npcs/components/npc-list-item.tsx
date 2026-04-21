import { cn } from "@lootlog/ui/lib/utils";
import { motion } from "framer-motion";
import { Crown, Swords, Sparkles, type LucideIcon } from "lucide-react";
import type { FC } from "react";
import type {
  LootlogConfigNpcResponseDtoOutput as LootlogConfigNpc,
  LootlogConfigNpcResponseDtoOutputAllowedRaritiesItem as LootlogConfigNpcAllowedRarity,
} from "@/lib/api/generated/main/model";
import { useTranslation } from "react-i18next";
import { useSelectorPanel } from "@/components/selector-panel";
import { SelectableListCard } from "@/components/selectable-list-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";

const RARITY_CONFIG: {
  key: LootlogConfigNpcAllowedRarity;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  label: string;
}[] = [
  {
    key: "LEGENDARY",
    color: "text-amber-700",
    bgColor: "bg-amber-700/10",
    icon: Crown,
    label: "Legendarny",
  },
  {
    key: "HEROIC",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    icon: Swords,
    label: "Heroiczny",
  },
  {
    key: "UNIQUE",
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

  const iconsContent = (
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
      <SelectableListCard
        isSelected={isSelected}
        onClick={() => handleSelect(npc)}
        icons={iconsContent}
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {t(`npcType.${npc.npcType}`)}
          </div>
        </div>
      </SelectableListCard>
    </motion.div>
  );
};
