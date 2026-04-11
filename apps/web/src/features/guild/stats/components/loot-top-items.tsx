import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { ItemImage } from "@/components/tiles/item-image";
import { ItemRarity } from "@/hooks/api/loots/use-loots";
import type { TopItem } from "../hooks/use-loot-stats";

type LootTopItemsProps = {
  data?: TopItem[];
  isLoading?: boolean;
};

export const LootTopItems: React.FC<LootTopItemsProps> = ({
  data,
  isLoading,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className="bg-card/40 backdrop-blur-sm border-border p-3 gap-3">
        <h2 className="text-base font-semibold">
          {t("loots.stats.topItems.title")}
        </h2>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card className="bg-card/40 backdrop-blur-sm border-border p-3 gap-3">
        <h2 className="text-base font-semibold">
          {t("loots.stats.topItems.title")}
        </h2>
        <div className="flex h-[250px] items-center justify-center text-muted-foreground">
          {t("loots.stats.topItems.noData")}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card/40 backdrop-blur-sm border-border p-3 gap-3">
      <h2 className="text-base font-semibold">
        {t("loots.stats.topItems.title")}
      </h2>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.itemId} className="flex items-center gap-3">
            <ItemImage rarity={ItemRarity.LEGENDARY} icon={item.icon} />
            <span className="flex-1 truncate text-sm">{item.name}</span>
            <span className="text-muted-foreground tabular-nums text-sm">
              {item.count}x
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
