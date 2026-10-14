import { BandSection } from "@/components/common/band-section";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { SettingsDetailSkeleton } from "../components/settings-detail-skeleton";
import { NPC_RARITY_CONFIG } from "./npc-rarity-config";

export const NpcSettingsDetailSkeleton = () => {
  const { t } = useTranslation();

  return (
    <SettingsDetailSkeleton
      meta={
        <span className="text-xs leading-tight">
          <SkeletonLine className="h-3 w-24" />
        </span>
      }
    >
      <div className="pb-24">
        <BandSection
          id="npc-rarities-skeleton"
          title={t("settings.npcs.raritiesTitle")}
          description={t("settings.npcs.raritiesDescription")}
          tiled
        >
          {NPC_RARITY_CONFIG.map((rarity) => (
            <div
              key={rarity.key}
              data-list-tile
              className={cn(
                "flex items-center gap-3 py-3",
                LIST_TILE_RULE_CLASS,
                LIST_TILE_INSET_CLASS,
              )}
            >
              <Skeleton className="size-4 shrink-0 rounded-[4px]" />
              <Skeleton className="size-7 shrink-0 rounded-md" />
              <span className={cn("text-sm font-medium", rarity.color)}>
                {t(`itemRarity.${rarity.key}`)}
              </span>
            </div>
          ))}
        </BandSection>
      </div>
    </SettingsDetailSkeleton>
  );
};
