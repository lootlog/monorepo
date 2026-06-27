import type { AbyssSeason } from "@/lib/api/battlelog-types";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { Trophy } from "lucide-react";
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

export function AbyssSeasonsTable({
  isLoading,
  onSelect,
  seasons,
  selectedSeasonId,
}: AbyssSeasonsTableProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <Card className="min-w-0 gap-3 border-border bg-card/40 p-0 backdrop-blur-sm">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="rounded-xl bg-amber-500/10 p-2.5 shadow-inner shadow-amber-500/10">
          <Trophy className="size-4 text-amber-500" />
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-semibold leading-tight">
            {t("battlePanel.abyss.seasonsTitle")}
          </h3>
          <p className="text-xs leading-tight text-muted-foreground">
            {t("battlePanel.abyss.seasonsSubtitle")}
          </p>
        </div>
      </div>

      {seasons.length === 0 && !isLoading ? (
        <div className="p-4 text-sm text-muted-foreground">
          {t("battlePanel.abyss.noSeason")}
        </div>
      ) : isMobile ? (
        <div className="grid gap-2 p-3">
          {seasons.map((season) => {
            const isSelected = season.id === selectedSeasonId;

            return (
              <div
                key={season.id}
                className="rounded-md border border-border bg-background/80 p-3"
                data-state={isSelected ? "selected" : undefined}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {getAbyssSeasonRangeLabel(season)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("battlePanel.abyss.seasonsTable.totalBattles")}:{" "}
                      {season.totalBattles}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm font-semibold">
                    {formatAbyssNumber(season.winRate)}%
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="text-muted-foreground">
                      {t("battlePanel.abyss.seasonsTable.record")}
                    </div>
                    <div className="font-semibold">
                      {season.wins}
                      {t("battlePanel.statistics.columns.w")} / {season.losses}
                      {t("battlePanel.statistics.columns.l")}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="text-muted-foreground">
                      {t("battlePanel.abyss.seasonsTable.ratingDelta")}
                    </div>
                    <div className="font-semibold">
                      {formatAbyssSignedNumber(season.totalRatingDelta)}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="text-muted-foreground">
                      {t("battlePanel.abyss.seasonsTable.peakRating")}
                    </div>
                    <div className="font-semibold">
                      {season.peakRating === null
                        ? "-"
                        : formatAbyssNumber(season.peakRating)}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="text-muted-foreground">
                      {t("battlePanel.abyss.seasonsTable.points")}
                    </div>
                    <div className="font-semibold">
                      {season.totalPointsGained === null
                        ? "-"
                        : formatAbyssNumber(season.totalPointsGained)}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  className="mt-3 w-full"
                  onClick={() => onSelect(season)}
                >
                  {isSelected
                    ? t("battlePanel.abyss.currentSeason")
                    : t("battlePanel.abyss.selectSeason")}
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <ScrollArea className="w-full">
          <Table className="min-w-[860px]">
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
                <TableHead className="text-right">
                  {t("battlePanel.abyss.seasonsTable.action")}
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
                  >
                    <TableCell className="font-medium">
                      {getAbyssSeasonRangeLabel(season)}
                    </TableCell>
                    <TableCell className="text-right">
                      {season.totalBattles}
                    </TableCell>
                    <TableCell className="text-right">
                      {season.wins}
                      {t("battlePanel.statistics.columns.w")} / {season.losses}
                      {t("battlePanel.statistics.columns.l")}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAbyssNumber(season.winRate)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAbyssSignedNumber(season.totalRatingDelta)}
                    </TableCell>
                    <TableCell className="text-right">
                      {season.peakRating === null
                        ? "-"
                        : formatAbyssNumber(season.peakRating)}
                    </TableCell>
                    <TableCell className="text-right">
                      {season.totalPointsGained === null
                        ? "-"
                        : formatAbyssNumber(season.totalPointsGained)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => onSelect(season)}
                      >
                        {isSelected
                          ? t("battlePanel.abyss.currentSeason")
                          : t("battlePanel.abyss.selectSeason")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </Card>
  );
}
