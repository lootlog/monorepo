import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Clock, AlertCircle } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import type { KillParticipant } from "../../hooks/queries/use-hero-kill-history";

interface KillParticipantsListProps {
  participants: KillParticipant[];
  compact?: boolean;
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

export const KillParticipantsList = ({
  participants,
  compact = false,
}: KillParticipantsListProps) => {
  const { t } = useTranslation();

  if (participants.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
        <AlertCircle className="w-4 h-4" />
        <span>{t("events.kills.noParticipants")}</span>
      </div>
    );
  }

  const sortedParticipants = [...participants].sort(
    (a, b) => b.points - a.points,
  );

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {sortedParticipants.slice(0, 5).map((participant) => (
          <Tooltip key={participant.id}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={participant.member.avatar ?? undefined} />
                  <AvatarFallback className="text-[8px]">
                    {participant.member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{participant.points}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{participant.member.name}</p>
              <p className="text-xs text-muted-foreground">
                {t("events.kills.pointsBreakdown", {
                  base: participant.basePoints,
                  multiplier: participant.appliedMultiplier.toFixed(2),
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {participant.mapName}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
        {sortedParticipants.length > 5 && (
          <div className="px-2 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
            +{sortedParticipants.length - 5}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedParticipants.map((participant) => (
        <div
          key={participant.id}
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg transition-colors",
            participant.wasPresent ? "bg-muted/30" : "bg-muted/10 opacity-60",
          )}
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={participant.member.avatar ?? undefined} />
            <AvatarFallback className="text-xs">
              {participant.member.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {participant.member.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {participant.mapName}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(participant.timeOnMapSeconds)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("events.kills.timeOnMap")}</p>
              </TooltipContent>
            </Tooltip>

            {participant.afkPercentage > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-amber-500">
                    {Math.round(participant.afkPercentage)}% AFK
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("events.kills.afkPercentage")}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="text-right shrink-0">
            <p className="font-bold text-primary">{participant.points}</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs text-muted-foreground cursor-help">
                  {participant.basePoints} x{" "}
                  {participant.appliedMultiplier.toFixed(2)}
                </p>
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
          </div>
        </div>
      ))}
    </div>
  );
};
