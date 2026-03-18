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
import { formatDurationHuman, formatMapNamesFromMapData } from "../../utils";

interface KillParticipantsListProps {
  participants: KillParticipant[];
  compact?: boolean;
}

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
        {sortedParticipants.slice(0, 5).map((participant) => {
          const bonusPoints =
            Math.round(
              Math.max(0, participant.points - participant.basePoints) * 100,
            ) / 100;
          const mapNamesLabel = formatMapNamesFromMapData(participant.mapData);
          return (
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
                  {`base: ${participant.basePoints}, bonus: ${bonusPoints}`}
                </p>
                <p className="text-xs text-muted-foreground">{mapNamesLabel}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
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
      {sortedParticipants.map((participant) => {
        const bonusPoints =
          Math.round(
            Math.max(0, participant.points - participant.basePoints) * 100,
          ) / 100;
        const mapNamesLabel = formatMapNamesFromMapData(participant.mapData);
        return (
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
                {mapNamesLabel}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatDurationHuman(participant.timeOnMapSeconds)}
                    </span>
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
                    {participant.basePoints} + {bonusPoints}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{`base: ${participant.basePoints}, bonus: ${bonusPoints}`}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        );
      })}
    </div>
  );
};
