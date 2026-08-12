import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { ArrowRight, History, Info } from "lucide-react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@lootlog/ui/components/popover";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import type { EventRanking } from "../../types/api";
import { formatPoints, formatSignedPoints } from "../../utils/format-points";

type EventRankingPointsProps = {
  ranking: EventRanking;
  canViewHistory: boolean;
};

export const EventRankingPoints = ({
  ranking,
  canViewHistory,
}: EventRankingPointsProps) => {
  const { t } = useTranslation();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const pointsValue = (
    <>
      <span className="text-sm font-bold text-primary tabular-nums @md/ranking:text-base">
        {formatPoints(ranking.totalPoints)}
      </span>
      <span className="text-[10px] font-medium text-primary/75 @md/ranking:text-xs">
        {t("events.common.pointsShort", "pkt")}
      </span>
    </>
  );

  if (!ranking.pointsModified) {
    return (
      <span className="flex items-baseline justify-end gap-1 truncate text-sm">
        {pointsValue}
      </span>
    );
  }

  if (!canViewHistory) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="flex items-center justify-end gap-1 text-sm"
            tabIndex={0}
            aria-label={t("events.points.modified")}
          >
            <Info className="size-3.5 shrink-0 text-amber-400" />
            {pointsValue}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("events.points.modified")}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
      <Tooltip>
        <PopoverAnchor asChild>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              aria-label={t("events.points.history")}
              className="ml-auto flex min-h-9 items-center justify-end gap-1 rounded-md px-1 text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Info className="size-3.5 shrink-0 text-amber-400" />
              {pointsValue}
            </button>
          </TooltipTrigger>
        </PopoverAnchor>
        <TooltipContent>
          <p>{t("events.points.history")}</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent className="w-80 overflow-hidden p-0" align="end">
        <div className="max-h-[70vh] overflow-hidden">
          <div className="border-b border-border p-3">
            <div className="flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">
                {t("events.points.history")}
              </h2>
            </div>
          </div>
          <ScrollArea className="h-60">
            {ranking.editHistory.length > 0 ? (
              <div className="space-y-2 p-2">
                {ranking.editHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-border bg-card p-2 text-sm"
                  >
                    <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                      <span className="text-xs">
                        {format(new Date(entry.editedAt), "d MMM yyyy, HH:mm", {
                          locale: pl,
                        })}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {entry.editType === "RANKING"
                          ? t("events.points.historyTypeRanking")
                          : t("events.points.historyTypeKill")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("events.points.historyEditedBy", {
                        editorName:
                          entry.editedByName ??
                          t("events.points.historyEditorUnknown"),
                      })}
                    </p>
                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-destructive">
                        {formatPoints(entry.previousPoints)}
                      </span>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <span className="text-green-500">
                        {formatPoints(entry.newPoints)}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-primary">
                        {formatSignedPoints(entry.deltaPoints)}
                      </span>
                    </div>
                    {entry.comment ? (
                      <p className="mt-2 whitespace-pre-wrap break-words rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
                        {entry.comment}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t("events.points.noHistory")}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};
