import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trophy, Pencil, Check, X, PenLine, History, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { EventRanking } from "../hooks/queries/use-events";
import { cn } from "@lootlog/ui/lib/utils";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useUpdatePoints } from "../hooks/mutations/use-update-points";
import { useRankingEditHistory } from "../hooks/queries/use-ranking-edit-history";

interface EventRankingTableProps {
  rankings: EventRanking[];
  guildId?: string;
  eventId?: string;
  canEdit?: boolean;
}

interface RankingRowProps {
  ranking: EventRanking;
  position: number;
  canEdit?: boolean;
  onEditPoints?: (rankingId: string, newPoints: number) => Promise<void>;
  isEditPending?: boolean;
  guildId?: string;
  eventId?: string;
}

const RankingRow = ({
  ranking,
  position,
  canEdit,
  onEditPoints,
  isEditPending,
  guildId,
  eventId,
}: RankingRowProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(ranking.totalPoints));
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: editHistory, isLoading: historyLoading } = useRankingEditHistory({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
    rankingId: ranking.id,
    enabled: historyOpen && ranking.pointsModified,
  });

  const isTop3 = position <= 3;

  const handleEditClick = () => {
    setEditValue(String(ranking.totalPoints));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(String(ranking.totalPoints));
  };

  const handleConfirmEdit = async () => {
    const newPoints = parseInt(editValue, 10);
    if (isNaN(newPoints) || newPoints < 0) {
      return;
    }
    if (onEditPoints) {
      await onEditPoints(ranking.id, newPoints);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirmEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg transition-colors",
        isTop3 ? "bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
          position === 1 && "bg-yellow-500 text-yellow-950",
          position === 2 && "bg-gray-300 text-gray-800",
          position === 3 && "bg-amber-700 text-amber-100",
          position > 3 && "bg-muted text-muted-foreground",
        )}
      >
        {position}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {ranking.member?.name || `Gracz #${ranking.memberId}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("events.ranking.killCount", { count: ranking.totalKills })}
        </p>
      </div>

      <div className="text-right shrink-0 flex items-center gap-1">
        {isEditing ? (
          <>
            <Input
              type="number"
              min={0}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-20 h-8 text-sm"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleConfirmEdit}
              disabled={isEditPending}
            >
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleCancelEdit}
              disabled={isEditPending}
            >
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1">
              {ranking.pointsModified && canEdit && (
                <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                    >
                      <PenLine className="h-3 w-3 text-amber-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-3 border-b">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium text-sm">{t("events.points.history")}</h4>
                      </div>
                    </div>
                    <ScrollArea className="max-h-60">
                      {historyLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          {t("events.kills.loading")}
                        </div>
                      ) : editHistory && editHistory.length > 0 ? (
                        <div className="p-2 space-y-2">
                          {editHistory.map((entry) => (
                            <div
                              key={entry.id}
                              className="p-2 rounded-md bg-muted/50 text-sm"
                            >
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <span className="text-xs">
                                  {format(new Date(entry.editedAt), "d MMM yyyy, HH:mm", { locale: pl })}
                                </span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                                  {entry.editType === "RANKING"
                                    ? t("events.points.historyTypeRanking")
                                    : t("events.points.historyTypeKill")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 font-medium">
                                <span className="text-red-500">{entry.previousPoints}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="text-green-500">{entry.newPoints}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          {t("events.points.noHistory")}
                        </div>
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              )}
              {ranking.pointsModified && !canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PenLine className="h-3 w-3 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("events.points.modified")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <p className="font-bold text-primary">
                {t("events.ranking.pointCount", { count: ranking.totalPoints })}
              </p>
            </div>
            {canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={handleEditClick}
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("events.points.edit")}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const EventRankingTable = ({
  rankings,
  guildId,
  eventId,
  canEdit = false,
}: EventRankingTableProps) => {
  const { t } = useTranslation();

  const { updateRankingPoints } = useUpdatePoints(guildId ?? "", eventId ?? "");

  const handleEditPoints = async (rankingId: string, newPoints: number) => {
    try {
      await updateRankingPoints.mutateAsync({
        rankingId,
        totalPoints: newPoints,
      });
      toast.success(t("events.points.editSuccess"));
    } catch {
      toast.error(t("events.points.editError"));
    }
  };

  if (rankings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
        <Trophy className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">{t("events.ranking.noRanking")}</p>
      </div>
    );
  }

  const sortedRankings = [...rankings].sort(
    (a, b) => b.totalPoints - a.totalPoints,
  );

  return (
    <div className="space-y-2">
      {sortedRankings.map((ranking, index) => (
        <RankingRow
          key={ranking.id}
          ranking={ranking}
          position={index + 1}
          canEdit={canEdit}
          onEditPoints={handleEditPoints}
          isEditPending={updateRankingPoints.isPending}
          guildId={guildId}
          eventId={eventId}
        />
      ))}
    </div>
  );
};
