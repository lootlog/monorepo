import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { SectionCard } from "@/components/common/section-card/section-card";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { EmptyState } from "@/components/common/empty-state";
import type { AbyssSeason } from "@/lib/api/battlelog-types";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Table } from "@lootlog/ui/components/table";
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

const getAbyssSeasonCellClassName = (columnId: string) => {
  if (columnId === "range") {
    return "font-medium";
  }

  if (columnId === "record" || columnId === "ratingDelta") {
    return "text-right font-medium";
  }

  return "text-right";
};

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

  const columns: ColumnDef<typeof coreTableFeatures, AbyssSeason>[] = [
    {
      id: "range",
      header: () => t("battlePanel.abyss.seasonsTable.range"),
      cell: ({ row: { original: season } }) => getAbyssSeasonRangeLabel(season),
    },
    {
      id: "totalBattles",
      header: () => t("battlePanel.abyss.seasonsTable.totalBattles"),
      cell: ({ row: { original: season } }) => season.totalBattles,
    },
    {
      id: "record",
      header: () => t("battlePanel.abyss.seasonsTable.record"),
      cell: ({ row: { original: season } }) => renderRecord(season),
    },
    {
      id: "winRate",
      header: () => t("battlePanel.abyss.seasonsTable.winRate"),
      cell: ({ row: { original: season } }) =>
        `${formatAbyssNumber(season.winRate)}%`,
    },
    {
      id: "ratingDelta",
      header: () => t("battlePanel.abyss.seasonsTable.ratingDelta"),
      cell: ({ row: { original: season } }) =>
        formatAbyssSignedNumber(season.totalRatingDelta),
    },
    {
      id: "peakRating",
      header: () => t("battlePanel.abyss.seasonsTable.peakRating"),
      cell: ({ row: { original: season } }) =>
        formatOptionalNumber(season.peakRating),
    },
    {
      id: "points",
      header: () => t("battlePanel.abyss.seasonsTable.points"),
      cell: ({ row: { original: season } }) =>
        formatOptionalNumber(season.totalPointsGained),
    },
    {
      id: "action",
      header: () => (
        <span className="sr-only">
          {t("battlePanel.abyss.seasonsTable.action")}
        </span>
      ),
      cell: ({ row: { original: season } }) => renderSelectButton(season),
    },
  ];

  const table = useTable({
    features: coreTableFeatures,
    data: seasons,
    columns,
    getRowId: (season) => season.id,
  });

  return (
    <SectionCard className="min-w-0 overflow-hidden">
      <SectionCardHeader
        icon={Trophy}
        title={t("battlePanel.abyss.seasonsTitle")}
        description={t("battlePanel.abyss.seasonsSubtitle")}
      />

      {seasons.length === 0 && !isLoading ? (
        <EmptyState icon={Trophy} title={t("battlePanel.abyss.noSeason")} />
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
            <TanStackTableHeader
              table={table}
              getHeadClassName={(header) =>
                header.column.id === "range" || header.column.id === "action"
                  ? ""
                  : "text-right"
              }
            />
            <TanStackTableBody
              table={table}
              rowClassName="h-12 tabular-nums"
              getCellClassName={(cell) =>
                cn(
                  getAbyssSeasonCellClassName(cell.column.id),
                  cell.column.id === "ratingDelta" &&
                    getRatingClassName(cell.row.original),
                )
              }
              getRowProps={(row) => ({
                "data-state":
                  row.original.id === selectedSeasonId ? "selected" : undefined,
              })}
            />
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </SectionCard>
  );
}
