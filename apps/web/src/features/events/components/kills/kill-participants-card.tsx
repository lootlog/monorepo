import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Button } from "@lootlog/ui/components/button";
import { Users, ChevronDown, Frown, MapPin, Pencil, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import type { KillDetailParticipant } from "../../hooks/queries/use-kill-detail";
import { useUpdatePoints } from "../../hooks/mutations/use-update-points";
import { ManualPointsEditDialog } from "../dialogs/manual-points-edit-dialog";
import {
  formatDurationHuman,
  aggregateMapData,
  normalizeBonusBreakdown,
} from "../../utils";

interface KillParticipantsCardProps {
  participants: KillDetailParticipant[];
  guildId?: string;
  eventId?: string;
  killId?: string;
  canEdit?: boolean;
}

interface ParticipantRowProps {
  participant: KillDetailParticipant;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
  guildId?: string;
  eventId?: string;
  canEdit?: boolean;
  onEditPoints?: (
    killPointId: string,
    pointsDelta: number,
    comment?: string,
  ) => Promise<void>;
  isEditPending?: boolean;
}

const formatPoints = (points: number): string => {
  return Number.isInteger(points) ? String(points) : points.toFixed(2);
};

const formatSignedPoints = (points: number): string => {
  if (points > 0) {
    return `+${formatPoints(points)}`;
  }

  return formatPoints(points);
};

const ParticipantRow = ({
  participant,
  rank,
  isExpanded,
  onToggle,
  guildId,
  eventId,
  canEdit,
  onEditPoints,
  isEditPending,
}: ParticipantRowProps) => {
  const { t } = useTranslation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const avatarUrl = getDiscordAvatarUrl(
    participant.member.userId,
    participant.member.avatar,
    32,
  );
  const roleColor = participant.member.roles?.[0]?.color;
  const nameStyle = roleColor
    ? { color: `#${roleColor.toString(16).padStart(6, "0")}` }
    : undefined;

  const aggregatedMaps = participant.mapData
    ? aggregateMapData(participant.mapData)
    : [];

  const totalAfkSeconds = aggregatedMaps.reduce(
    (sum, map) => sum + map.afkTimeSeconds,
    0,
  );
  const bonusBreakdown = normalizeBonusBreakdown(participant.bonusBreakdown);
  const manualAdjustmentPoints = participant.manualAdjustmentPoints ?? 0;
  const autoTotalPoints = participant.points - manualAdjustmentPoints;
  const fallbackBonusPoints =
    Math.round(Math.max(0, autoTotalPoints - participant.basePoints) * 10000) /
    10000;
  const bonusPoints =
    bonusBreakdown.length > 0
      ? Math.round(
          bonusBreakdown.reduce((sum, item) => sum + item.points, 0) * 10000,
        ) / 10000
      : fallbackBonusPoints;
  const uncappedTotal = participant.basePoints + bonusPoints;
  const capReduction = Math.max(0, uncappedTotal - autoTotalPoints);
  const trackingDurationPercentage =
    typeof participant.trackingDurationPercentage === "number"
      ? `${Math.round(participant.trackingDurationPercentage)}%`
      : "—";
  const getBonusName = (bonus: (typeof bonusBreakdown)[number]) => {
    if (bonus.ruleName) {
      return bonus.ruleName;
    }
    return t("events.kills.pointsTooltip.unnamedBonus");
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      await onEditPoints(participant.id, pointsDelta, comment);
    }
  };

  const shouldLinkToMemberKills = Boolean(guildId && eventId);
  const memberLinkParams = shouldLinkToMemberKills
    ? {
        guildId: guildId ?? "",
        eventId: eventId ?? "",
        memberId: String(participant.member.id),
      }
    : null;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="rounded-lg transition-colors overflow-hidden bg-muted/30">
        <CollapsibleTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className="flex items-center gap-3 p-3 w-full text-left hover:bg-muted/40 transition-colors cursor-pointer"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle();
              }
            }}
          >
            <span className="text-xs text-muted-foreground w-5 shrink-0 text-center font-medium">
              #{rank}
            </span>

            <Avatar className="w-8 h-8">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-xs">
                {participant.member.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex min-w-0 flex-1 flex-col">
              {memberLinkParams ? (
                <Link
                  to="/$guildId/events/$eventId/members/$memberId"
                  params={memberLinkParams}
                  className="w-fit max-w-full rounded-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  style={nameStyle}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <span className="block truncate">
                    {participant.member.name}
                  </span>
                </Link>
              ) : (
                <span className="truncate font-medium" style={nameStyle}>
                  {participant.member.name}
                </span>
              )}

              {participant.trackingDurationSeconds !== null && (
                <span className="text-xs text-muted-foreground">
                  {formatDurationHuman(participant.trackingDurationSeconds)}
                  &nbsp;
                  {t("events.kills.trackingDuration")}
                </span>
              )}
            </div>

            {totalAfkSeconds > 0 && (
              <span className="text-xs text-amber-500 shrink-0">
                {t("events.kills.afkTime")}:{" "}
                {formatDurationHuman(totalAfkSeconds)}
              </span>
            )}

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-lg font-bold text-primary">
                {formatPoints(participant.points)}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between gap-4">
                      <span>{t("events.kills.pointsTooltip.basePoints")}:</span>
                      <span className="font-medium">
                        {formatPoints(participant.basePoints)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>
                        {t("events.kills.pointsTooltip.trackingPercentage")}:
                      </span>
                      <span className="font-medium">
                        {trackingDurationPercentage}
                      </span>
                    </div>
                    {bonusBreakdown.length > 0 ? (
                      <>
                        {bonusBreakdown.map((bonus) => (
                          <div
                            key={`${bonus.ruleId}:${bonus.points}:${bonus.ruleName ?? ""}`}
                            className="flex justify-between gap-4"
                          >
                            <span>
                              {t("events.kills.pointsTooltip.bonusItem", {
                                name: getBonusName(bonus),
                              })}
                              :
                            </span>
                            <span className="font-medium">
                              +{formatPoints(bonus.points)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between gap-4">
                          <span>
                            {t("events.kills.pointsTooltip.bonusTotal")}:
                          </span>
                          <span className="font-medium">
                            +{formatPoints(bonusPoints)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between gap-4">
                        <span>
                          {t("events.kills.pointsTooltip.bonusTotal")}:
                        </span>
                        <span className="font-medium">
                          +{formatPoints(bonusPoints)}
                        </span>
                      </div>
                    )}
                    {manualAdjustmentPoints !== 0 && (
                      <div className="flex justify-between gap-4">
                        <span>
                          {t("events.kills.pointsTooltip.manualAdjustment")}:
                        </span>
                        <span className="font-medium">
                          {formatSignedPoints(manualAdjustmentPoints)}
                        </span>
                      </div>
                    )}
                    {capReduction > 0 && (
                      <div className="flex justify-between gap-4">
                        <span>
                          {t("events.kills.pointsTooltip.capReduction")}:
                        </span>
                        <span className="font-medium">
                          -{formatPoints(capReduction)}
                        </span>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between gap-4 border-t border-border/50 pt-1">
                      <span>{t("events.kills.pointsTooltip.total")}:</span>
                      <span className="font-medium">
                        {formatPoints(participant.points)}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
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

            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground shrink-0 transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border/50">
            {aggregatedMaps.length > 0 && (
              <div className="pt-3 space-y-2">
                {aggregatedMaps.map((mapInfo) => (
                  <div key={mapInfo.mapId} className="text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="font-medium">{mapInfo.mapName}</span>
                    </div>
                    <div className="ml-5 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>
                        {t("events.kills.assignmentTime")}:{" "}
                        {formatDurationHuman(mapInfo.assignmentDurationSeconds)}
                      </span>
                      <span>
                        {t("events.kills.presenceTime")}:{" "}
                        {formatDurationHuman(mapInfo.presenceTimeSeconds)}
                      </span>
                      {mapInfo.afkTimeSeconds > 0 && (
                        <span className="text-amber-500">
                          {t("events.kills.afkTime")}:{" "}
                          {formatDurationHuman(mapInfo.afkTimeSeconds)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
      <ManualPointsEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title={t("events.points.killDialogTitle", {
          memberName: participant.member.name,
        })}
        description={t("events.points.killDialogDescription", {
          memberName: participant.member.name,
        })}
        currentPoints={participant.points}
        isPending={isEditPending}
        onSubmit={handleDialogSubmit}
      />
    </Collapsible>
  );
};

export const KillParticipantsCard = ({
  participants,
  guildId,
  eventId,
  killId,
  canEdit = false,
}: KillParticipantsCardProps) => {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { updateKillPoint } = useUpdatePoints(guildId ?? "", eventId ?? "");

  const sorted = [...participants].sort((a, b) => b.points - a.points);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEditPoints = async (
    killPointId: string,
    pointsDelta: number,
    comment?: string,
  ) => {
    if (!killId) return;
    try {
      await updateKillPoint.mutateAsync({
        killId,
        killPointId,
        pointsDelta,
        comment,
      });
      toast.success(t("events.points.editSuccess"));
    } catch (error) {
      toast.error(t("events.points.editError"));
      throw error;
    }
  };

  return (
    <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 shadow-inner shadow-primary/10">
          <Users className="size-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("events.killDetail.participantsSubtitle")}
          </p>
          <h3 className="text-base font-semibold">
            {t("events.killDetail.participants")}
          </h3>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <Frown className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">{t("events.kills.noParticipants")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((p, idx) => (
            <ParticipantRow
              key={p.id}
              participant={p}
              rank={idx + 1}
              isExpanded={expandedIds.has(p.id)}
              onToggle={() => toggleExpand(p.id)}
              guildId={guildId}
              eventId={eventId}
              canEdit={canEdit}
              onEditPoints={handleEditPoints}
              isEditPending={updateKillPoint.isPending}
            />
          ))}
        </div>
      )}
    </Card>
  );
};
