import { StatsTile } from "@lootlog/ui/components/stats-tile";
import { StatsTileGrid } from "@lootlog/ui/components/stats-tile-grid";
import { StatsTileNumber } from "@lootlog/ui/components/stats-tile-number";
import { Grid3x3, Rows3, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

type BingoMemberStatsProps = {
  readonly completedTileCount: number;
  readonly totalTileCount: number;
  readonly completedLineCount: number;
  readonly totalPoints: number;
};

export const BingoMemberStats = ({
  completedTileCount,
  totalTileCount,
  completedLineCount,
  totalPoints,
}: BingoMemberStatsProps) => {
  const { t } = useTranslation();

  return (
    <StatsTileGrid framed className="sm:grid-cols-3">
      <StatsTile
        icon={Grid3x3}
        label={t("bingo.stats.tiles")}
        value={<StatsTileNumber value={completedTileCount} />}
        detail={t("bingo.stats.tilesOfTotal", {
          total: totalTileCount,
        })}
      />
      <StatsTile
        icon={Rows3}
        label={t("bingo.stats.lines")}
        value={<StatsTileNumber value={completedLineCount} />}
      />
      <StatsTile
        icon={Trophy}
        label={t("bingo.stats.points")}
        value={<StatsTileNumber value={totalPoints} />}
      />
    </StatsTileGrid>
  );
};
