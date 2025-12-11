import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Input } from "@lootlog/ui/components/input";
import {
  Users,
  Clock,
  ChevronDown,
  Frown,
  MapPin,
  Moon,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import type { KillDetailParticipant } from "../hooks/queries/use-kill-detail";
import { useUpdatePoints } from "../hooks/mutations/use-update-points";

interface KillParticipantsCardProps {
  participants: KillDetailParticipant[];
  guildId?: string;
  eventId?: string;
  killId?: string;
  canEdit?: boolean;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

interface ParticipantRowProps {
  participant: KillDetailParticipant;
  rank: number;
  maxPoints: number;
  isExpanded: boolean;
  onToggle: () => void;
  canEdit?: boolean;
  onEditPoints?: (killPointId: string, newPoints: number) => Promise<void>;
  isEditPending?: boolean;
}

const ParticipantRow = ({
  participant,
  rank,
  maxPoints,
  isExpanded,
  onToggle,
  canEdit,
  onEditPoints,
  isEditPending,
}: ParticipantRowProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(participant.points));

  const avatarUrl = getDiscordAvatarUrl(
    participant.member.userId,
    participant.member.avatar,
    32,
  );
  const roleColor = participant.member.roles?.[0]?.color;
  const nameStyle = roleColor
    ? { color: `#${roleColor.toString(16).padStart(6, "0")}` }
    : undefined;

  const progressPercent =
    maxPoints > 0 ? (participant.points / maxPoints) * 100 : 0;

  const afkTimeSeconds = Math.round(
    (participant.timeOnMapSeconds * participant.afkPercentage) / 100,
  );

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(String(participant.points));
    setIsEditing(true);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditValue(String(participant.points));
  };

  const handleConfirmEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPoints = parseInt(editValue, 10);
    if (isNaN(newPoints) || newPoints < 0) {
      return;
    }
    if (onEditPoints) {
      await onEditPoints(participant.id, newPoints);
    }
    setIsEditing(false);
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirmEdit(e as unknown as React.MouseEvent);
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(String(participant.points));
    }
  };

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

            <span
              className="font-medium truncate flex-1 min-w-0"
              style={nameStyle}
            >
              {participant.member.name}
            </span>

            {isEditing ? (
              <div className="flex items-center gap-1 shrink-0" onClick={handleInputClick}>
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
              </div>
            ) : (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-lg font-bold text-primary">
                  {participant.points}
                </span>
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
              </div>
            )}

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
            <div className="pt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{participant.mapName}</span>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>{formatDuration(participant.timeOnMapSeconds)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("events.kills.timeOnMap")}</p>
                </TooltipContent>
              </Tooltip>

              {afkTimeSeconds > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-amber-500">
                      <Moon className="w-4 h-4 shrink-0" />
                      <span>{formatDuration(afkTimeSeconds)} AFK</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("events.kills.afkPercentage")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm text-muted-foreground cursor-help">
                  {participant.basePoints} &times;{" "}
                  {participant.appliedMultiplier.toFixed(2)}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {t("events.kills.pointsBreakdown", {
                    base: participant.basePoints,
                    multiplier: participant.appliedMultiplier.toFixed(2),
                  })}
                </p>
              </TooltipContent>
            </Tooltip>

            <div className="space-y-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground text-right">
                {progressPercent.toFixed(0)}%{" "}
                {t("events.ranking.points").toLowerCase()}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
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
  const maxPoints = sorted[0]?.points ?? 0;

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

  const handleEditPoints = async (killPointId: string, newPoints: number) => {
    if (!killId) return;
    try {
      await updateKillPoint.mutateAsync({
        killId,
        killPointId,
        points: newPoints,
      });
      toast.success(t("events.points.editSuccess"));
    } catch {
      toast.error(t("events.points.editError"));
    }
  };

  return (
    <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2">
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        {t("events.killDetail.participants")}
      </h3>

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
              maxPoints={maxPoints}
              isExpanded={expandedIds.has(p.id)}
              onToggle={() => toggleExpand(p.id)}
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
