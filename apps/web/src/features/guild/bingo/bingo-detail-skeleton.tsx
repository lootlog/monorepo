import { DetailBarFact } from "@/components/common/detail-bar-fact";
import { DetailBarFacts } from "@/components/common/detail-bar-facts";
import { DetailSkeleton } from "@/components/common/detail-skeleton";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";
import { BandSection } from "@lootlog/ui/components/band-section";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { LIST_TILE_INSET_CLASS } from "@lootlog/ui/lib/list-tile";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { BINGO_DETAIL_COLUMNS_CLASS } from "./bingo-detail-layout";

const FACT_LABEL_KEYS = [
  "bingo.header.status",
  "bingo.header.world",
  "bingo.header.mode",
  "bingo.header.size",
] as const;

export const BingoDetailSkeleton = () => {
  const { t } = useTranslation();

  return (
    <DetailSkeleton
      meta={
        <DetailBarFacts>
          {FACT_LABEL_KEYS.map((key) => (
            <DetailBarFact key={key} label={t(key)}>
              <SkeletonLine className="h-3 w-16" />
            </DetailBarFact>
          ))}
        </DetailBarFacts>
      }
    >
      <StatsSectionColumns className={BINGO_DETAIL_COLUMNS_CLASS}>
        <BandSection
          id="bingo-board-skeleton"
          title={t("bingo.board.title")}
          tiled
        >
          <div
            className={cn(
              "grid grid-cols-2 gap-2 py-4 lg:grid-cols-5",
              LIST_TILE_INSET_CLASS,
            )}
          >
            {Array.from({ length: 10 }, (_, index) => (
              <Skeleton key={index} className="h-32 rounded-lg" />
            ))}
          </div>
        </BandSection>
        <BandSection
          id="bingo-leaderboard-skeleton"
          title={t("bingo.leaderboard.title")}
          tiled
        >
          {Array.from({ length: 5 }, (_, index) => (
            <ListTileSkeleton key={index} media="none" />
          ))}
        </BandSection>
      </StatsSectionColumns>
    </DetailSkeleton>
  );
};
