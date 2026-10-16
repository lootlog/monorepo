import type { AbyssSeason } from "@/lib/api/battlelog-types";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAbyssSeasonRangeLabel } from "./abyss-formatters";

export type AbyssSeasonFilterProps = {
  seasons: AbyssSeason[];
  selectedSeasonId?: string;
  isLoadingSeasons: boolean;
  onSeasonChange: (seasonId: string | null) => void;
};

/** Picks the Abyss season whose battles and statistics the hub shows. */
export const AbyssSeasonFilter = ({
  seasons,
  selectedSeasonId,
  isLoadingSeasons,
  onSeasonChange,
  width,
}: AbyssSeasonFilterProps & { width: string }) => {
  const { t } = useTranslation();
  const hasNoSeasons = seasons.length === 0 && !isLoadingSeasons;

  return (
    <FilterPopover
      icon={Trophy}
      showSearch={false}
      options={seasons.map((season, index) => ({
        value: season.id,
        label:
          index === 0
            ? t("battlePanel.abyss.latestSeason")
            : getAbyssSeasonRangeLabel(season),
      }))}
      value={selectedSeasonId}
      onValueChange={onSeasonChange}
      disabled={isLoadingSeasons || seasons.length === 0}
      placeholder={
        hasNoSeasons
          ? t("battlePanel.abyss.noSeason")
          : t("battlePanel.abyss.selectSeason")
      }
      label={t("battlePanel.abyss.season")}
      emptyMessage={t("battlePanel.abyss.noSeason")}
      width={width}
      triggerClassName="min-w-0"
      contentClassName="w-[260px]"
    />
  );
};
