import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Trophy, Pencil, PenLine, History, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { EventRanking } from "../../types/api";
import { cn } from "@lootlog/ui/lib/utils";
import { Button } from "@lootlog/ui/components/button";
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
import {
  useListRankingEditHistory,
  useUpdateRankingPoints,
} from "@/lib/api/generated/main/events/events";
import { invalidateRankingQueries } from "../../hooks/mutations/invalidate-ranking-queries";
import { ManualPointsEditDialog } from "../dialogs/manual-points-edit-dialog";
import { formatPoints, formatSignedPoints } from "../../utils";

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
  onEditPoints?: (
    rankingId: string,
    pointsDelta: number,
    comment?: string,
  ) => Promise<void>;
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: editHistory, isLoading: historyLoading } =
    useListRankingEditHistory({
      guildId: guildId ?? "",
      eventId: eventId ?? "",
      rankingId: ranking.id,
    });

  const isTop3 = position <= 3;
  const memberLabel =
    ranking.member?.name ||
    t("events.ranking.memberFallback", {
      memberId: ranking.memberId,
    });

  const handleEditClick = () => {
    setIsEditDialogOpen(true);
  };

  const handleDialogSubmit = async ({
    pointsDelta,
    comment,
  }: {
    pointsDelta: number;
    comment?: string;
  }) => {
    if (onEditPoints) {
      await onEditPoints(ranking.id, pointsDelta, comment);
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
        {guildId && eventId ? (
          <Link
            to="/$guildId/events/$eventId/members/$memberId"
            params={{
              guildId,
              eventId,
              memberId: String(ranking.memberId),
            }}
            className="font-medium truncate hover:underline"
          >
            {memberLabel}
          </Link>
        ) : (
          <p className="font-medium truncate">{memberLabel}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("events.ranking.killCount", { count: ranking.totalKills })}
        </p>
      </div>

      <div className="text-right shrink-0 flex items-center gap-1">
        <div className="flex items-center gap-1">
          {ranking.pointsModified && canEdit && (
            <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6">
                  <PenLine className="h-3 w-3 text-amber-500" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 overflow-hidden p-0" align="end">
                <div className="max-h-[70vh] overflow-hidden">
                  <div className="border-b p-3">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium">
                        {t("events.points.history")}
                      </h4>
                    </div>
                  </div>
                  <ScrollArea className="h-60">
                    {historyLoading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {t("events.kills.loading")}
                      </div>
                    ) : editHistory && editHistory.length > 0 ? (
                      <div className="space-y-2 p-2">
                        {editHistory.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-md bg-muted/50 p-2 text-sm"
                          >
                            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                              <span className="text-xs">
                                {format(
                                  new Date(entry.editedAt),
                                  "d MMM yyyy, HH:mm",
                                  { locale: pl },
                                )}
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
                              <span className="text-red-500">
                                {formatPoints(entry.previousPoints)}
                              </span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="text-green-500">
                                {formatPoints(entry.newPoints)}
                              </span>
                              <span className="rounded bg-background/80 px-1.5 py-0.5 text-xs text-primary">
                                {formatSignedPoints(entry.deltaPoints)}
                              </span>
                            </div>
                            {entry.comment && (
                              <p className="mt-2 whitespace-pre-wrap break-words rounded-md bg-background/70 px-2 py-1.5 text-xs text-muted-foreground">
                                {entry.comment}
                              </p>
                            )}
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
            {t("events.ranking.pointCount", {
              count: ranking.totalPoints,
            })}
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
                disabled={isEditPending}
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("events.points.edit")}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <ManualPointsEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title={t("events.points.rankingDialogTitle", {
          memberName: memberLabel,
        })}
        description={t("events.points.rankingDialogDescription", {
          heroNpcName: ranking.heroNpcName,
        })}
        currentPoints={ranking.totalPoints}
        isPending={isEditPending}
        onSubmit={handleDialogSubmit}
      />
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
  const queryClient = useQueryClient();
  const updateRankingPoints = useUpdateRankingPoints({
    mutation: {
      onSuccess: () => {
        if (!guildId || !eventId) {
          return;
        }

        invalidateRankingQueries(queryClient, guildId, eventId);
      },
    },
  });

  const handleEditPoints = async (
    rankingId: string,
    pointsDelta: number,
    comment?: string,
  ) => {
    try {
      await updateRankingPoints.mutateAsync({
        pathParams: {
          guildId: guildId ?? "",
          eventId: eventId ?? "",
          rankingId,
        },
        data: {
          pointsDelta,
          ...(comment ? { comment } : {}),
        },
      });
      toast.success(t("events.points.editSuccess"));
    } catch (error) {
      toast.error(t("events.points.editError"));
      throw error;
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
