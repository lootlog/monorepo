import { Clock } from "lucide-react";
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
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { cn } from "@/utils/cn";
import type { KillDetailParticipant } from "../../hooks/queries/use-kill-detail";
import type { TFunction } from "i18next";
import { formatMapNamesFromMapData } from "../../utils";

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
  t: TFunction;
}

export const ParticipantRow = ({ participant, t }: ParticipantRowProps) => {
  const avatarUrl = getDiscordAvatarUrl(
    participant.member.userId,
    participant.member.avatar,
    32,
  );
  const roleColor = participant.member.roles?.[0]?.color;
  const nameStyle = roleColor
    ? { color: `#${roleColor.toString(16).padStart(6, "0")}` }
    : undefined;
  const bonuses =
    Math.round(Math.max(0, participant.points - participant.basePoints) * 100) /
    100;
  const mapNamesLabel = formatMapNamesFromMapData(participant.mapData);

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors",
        participant.wasPresent ? "bg-muted/30" : "bg-muted/10 opacity-60",
      )}
    >
      <Avatar className="w-10 h-10">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="text-sm">
          {participant.member.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" style={nameStyle}>
          {participant.member.name}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {mapNamesLabel}
        </p>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
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
        <p className="text-lg font-bold text-primary">{participant.points}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-xs text-muted-foreground cursor-help">
              {participant.basePoints} + {bonuses}
            </p>
          </TooltipTrigger>
          <TooltipContent>
            <p>{`base: ${participant.basePoints}, bonus: ${bonuses}`}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
