import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { SectionCard } from "@/components/common/section-card/section-card";
import { BattlePanelEmptyState } from "@/features/user/battle-panel/components/battle-panel-empty-state";
import type { AbyssSeason } from "@/lib/api/battlelog-types";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { cn } from "cn";
import { Check, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  formatAbyssNumber,
  formatAbyssSignedNumber,
  getAbyssSeasonRangeLabel,
} from "./abyss-formatters";

type AbyssSeasonsTableProps = {
  isLoading: boolean;
  onSelect: (season: AbyssSeason) => void;
  seasons: AbyssSeason[];
  selectedSeasonId?: string;
};

const formatOptionalNumber = (value: number | null) =>
  value === null ? "–" : formatAbyssNumber(value);

export function AbyssSeasonsTable({
  isLoading,
  onSelect,
  seasons,
  selectedSeasonId,
}: AbyssSeasonsTableProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const renderSelectButton = (season: AbyssSeason, className?: string) => {
    const isSelected = season.id === selectedSeasonId;

    return (
      <Button
        type="button"
        size="sm"
        variant={isSelected ? "secondary" : "outline"}
        disabled={isSelected}
        className={className}
        onClick={() => onSelect(season)}
      >
        {isSelected && <Check className="size-4" aria-hidden="true" />}
        {isSelected
          ? t("battlePanel.abyss.currentSeason")
          : t("battlePanel.abyss.selectSeason")}
      </Button>
    );
  };

  const renderRecord = (season: AbyssSeason) => (
    <>
      <span className={BATTLE_TEXT_COLORS.result.won}>{season.wins}</span>
      <span className="px-1 text-muted-foreground">–</span>
      <span className={BATTLE_TEXT_COLORS.result.lost}>{season.losses}</span>
    </>
  );

  const getRatingClassName = (season: AbyssSeason) =>
    season.totalRatingDelta >= 0
      ? BATTLE_TEXT_COLORS.result.won
      : BATTLE_TEXT_COLORS.result.lost;

  return (
    <SectionCard className="min-w-0 overflow-hidden">
      <SectionCardHeader
        icon={Trophy}
        title={t("battlePanel.abyss.seasonsTitle")}
        description={t("battlePanel.abyss.seasonsSubtitle")}
      />

      {seasons.length === 0 && !isLoading ? (
        <BattlePanelEmptyState
          icon={Trophy}
          title={t("battlePanel.abyss.noSeason")}
        />
      ) : isMobile ? (
        <ul className="flex flex-col">
          {seasons.map((season) => (
            <li
              key={season.id}
              className={cn(
                "flex flex-col gap-3 border-b border-border/70 p-3 last:border-b-0",
                season.id === selectedSeasonId && "bg-primary/10",
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-semibold">
                  {getAbyssSeasonRangeLabel(season)}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {t("battlePanel.abyss.stats.totalBattles", {
                    count: season.totalBattles,
                  })}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs tabular-nums">
                {[
                  {
                    label: t("battlePanel.abyss.seasonsTable.record"),
                    value: renderRecord(season),
                  },
                  {
                    label: t("battlePanel.abyss.seasonsTable.winRate"),
                    value: `${formatAbyssNumber(season.winRate)}%`,
                  },
                  {
                    label: t("battlePanel.abyss.seasonsTable.ratingDelta"),
                    value: (
                      <span className={getRatingClassName(season)}>
                        {formatAbyssSignedNumber(season.totalRatingDelta)}
                      </span>
                    ),
                  },
                  {
                    label: t("battlePanel.abyss.seasonsTable.peakRating"),
                    value: formatOptionalNumber(season.peakRating),
                  },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground">{item.label}</dt>
                    <dd className="text-sm font-semibold">{item.value}</dd>
                  </div>
                ))}
              </dl>
              {renderSelectButton(season, "w-full")}
            </li>
          ))}
        </ul>
      ) : (
        <ScrollArea className="w-full">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>
                  {t("battlePanel.abyss.seasonsTable.range")}
                </TableHead>
                <TableHead className="text-right">
                  {t("battlePanel.abyss.seasonsTable.totalBattles")}
                </TableHead>
                <TableHead className="text-right">
                  {t("battlePanel.abyss.seasonsTable.record")}
                </TableHead>
                <TableHead className="text-right">
                  {t("battlePanel.abyss.seasonsTable.winRate")}
                </TableHead>
                <TableHead className="text-right">
                  {t("battlePanel.abyss.seasonsTable.ratingDelta")}
                </TableHead>
                <TableHead className="text-right">
                  {t("battlePanel.abyss.seasonsTable.peakRating")}
                </TableHead>
                <TableHead className="text-right">
                  {t("battlePanel.abyss.seasonsTable.points")}
                </TableHead>
                <TableHead>
                  <span className="sr-only">
                    {t("battlePanel.abyss.seasonsTable.action")}
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seasons.map((season) => {
                const isSelected = season.id === selectedSeasonId;

                return (
                  <TableRow
                    key={season.id}
                    data-state={isSelected ? "selected" : undefined}
                    className="h-12 tabular-nums"
                  >
                    <TableCell className="font-medium">
                      {getAbyssSeasonRangeLabel(season)}
                    </TableCell>
                    <TableCell className="text-right">
                      {season.totalBattles}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {renderRecord(season)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAbyssNumber(season.winRate)}%
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        getRatingClassName(season),
                      )}
                    >
                      {formatAbyssSignedNumber(season.totalRatingDelta)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatOptionalNumber(season.peakRating)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatOptionalNumber(season.totalPointsGained)}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderSelectButton(season)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </SectionCard>
  );
}
