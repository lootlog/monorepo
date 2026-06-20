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
