import { ItemImage } from "@lootlog/ui/components/item-image";
import type { LootStatsResponseDtoOutputTopItemsItem } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import {
  LEADERBOARD_SIZE,
  StatsLeaderboardSection,
} from "@/components/common/stats-leaderboard-section";
import { StatsLeaderboardRow } from "@/components/common/stats-leaderboard-row";

type LootTopItemsProps = {
  data?: LootStatsResponseDtoOutputTopItemsItem[];
  isLoading?: boolean;
};

export const LootTopItems = ({ data, isLoading }: LootTopItemsProps) => {
  const { t } = useTranslation();
  const items = data?.slice(0, LEADERBOARD_SIZE) ?? [];

  return (
    <StatsLeaderboardSection
      title={t("loots.stats.topItems.title")}
      description={t("loots.stats.topItems.description")}
      isLoading={isLoading}
      emptyMessage={
        items.length === 0 ? t("loots.stats.topItems.noData") : undefined
      }
    >
      {items.map((item, index) => (
        <StatsLeaderboardRow
          key={item.itemId}
          rank={index + 1}
          media={<ItemImage rarity={item.rarity} icon={item.icon} />}
          title={item.name}
          value={item.count}
        />
      ))}
    </StatsLeaderboardSection>
  );
};
