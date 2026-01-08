import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  UserPlus,
  X,
  AlertTriangle,
  Clock,
  Users,
  ChevronDown,
} from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { PlayerTile } from "@/components/tiles";
import { useLocalCoverageTimer } from "../../hooks/utils/use-local-coverage-timer";
import type { EventMap } from "../../hooks/queries/use-events";
import type { PlayerPresence } from "../../hooks/socket/use-event-presence";
import type { WindowStatus } from "../../hooks/queries/use-hero-respawn-config";
import type { CoverageGap } from "../../hooks/queries/use-map-coverage-timer";
import { MemberName } from "../shared/member-name";

export type MapStatus =
  | "ASSIGNED_PRESENT"
  | "ASSIGNED_ABSENT"
  | "ASSIGNED_AFK"
  | "UNASSIGNED";

export const STATUS_STYLES: Record<
  MapStatus,
  { bg: string; border: string; label: string; dot: string }
> = {
  ASSIGNED_PRESENT: {
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    label: "Monitoruje",
    dot: "bg-green-500",
  },
  ASSIGNED_ABSENT: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    label: "Nieobecny",
    dot: "bg-yellow-500",
  },
  ASSIGNED_AFK: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    label: "AFK",
    dot: "bg-orange-500",
  },
  UNASSIGNED: {
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    label: "Nieprzypisany",
    dot: "bg-destructive",
  },
};

const WINDOW_CLOSED_STYLE = {
  bg: "bg-muted/50",
  border: "border-muted-foreground/20",
  label: "Okno zamknięte",
  dot: "bg-muted-foreground/50",
};

/**
 * Get all players currently on a specific map
 */
export const getPlayersOnMap = (
  mapName: string,
  presenceData?: Map<string, PlayerPresence[]>,
): (PlayerPresence & { discordId: string })[] => {
  if (!presenceData) return [];

  const players: (PlayerPresence & { discordId: string })[] = [];

  presenceData.forEach((playerList, discordId) => {
    playerList.forEach((player) => {
      if (player.mapName === mapName) {
        players.push({ ...player, discordId });
      }
    });
  });

  return players;
};

export const getMapStatus = (
  map: EventMap,
  presenceData?: Map<string, PlayerPresence[]>,
): MapStatus => {
  if (!map.assignedMembers || map.assignedMembers.length === 0) {
    return "UNASSIGNED";
  }

  if (!presenceData || presenceData.size === 0) {
    return "ASSIGNED_ABSENT";
  }

  // Get all players currently on this map
  const playersOnMap = getPlayersOnMap(map.mapName, presenceData);

  // Someone is on the map and not AFK
  const hasActivePlayer = playersOnMap.some((p) => !p.isAfk);
  if (hasActivePlayer) {
    return "ASSIGNED_PRESENT";
  }

  // Someone is on the map but all are AFK
  const hasAfkPlayer = playersOnMap.some((p) => p.isAfk);
  if (hasAfkPlayer) {
    return "ASSIGNED_AFK";
  }

  return "ASSIGNED_ABSENT";
};

interface MapCardProps {
  map: EventMap;
  status: MapStatus;
  style: (typeof STATUS_STYLES)[MapStatus];
  canManage: boolean;
  currentMemberId?: number;
  presenceData?: Map<string, PlayerPresence[]>;
  assignmentDisabled: boolean;
  assignmentEnabledAt?: Date | null;
  onSelfAssignClick?: (mapId: string) => void;
  onSelfUnassignClick?: (mapId: string) => void;
  onManageClick?: (mapId: string) => void;
  windowStatus?: WindowStatus;
  activeGap?: CoverageGap | null;
}

const formatTimeRemaining = (targetDate: Date): string => {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  if (diff <= 0) return "0:00";

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const MapCard = ({
  map,
  status,
  style,
  canManage,
  currentMemberId,
  presenceData,
  assignmentDisabled,
  assignmentEnabledAt,
  onSelfAssignClick,
  onSelfUnassignClick,
  onManageClick,
  windowStatus = "OPEN",
  activeGap,
}: MapCardProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const memberCount = map.assignedMembers?.length || 0;
  const isAssignedToMe = map.assignedMembers?.some(
    (m) => m.id === currentMemberId,
  );
  const playersOnMap = getPlayersOnMap(map.mapName, presenceData);

  // Use activeGap from props (batch fetched by parent)
  const initialStartedAt = activeGap?.startedAt
    ? new Date(activeGap.startedAt)
    : null;

  // Local timer with backend initial value for persistence
  const { gapType, formattedDuration } = useLocalCoverageTimer(
    status,
    initialStartedAt,
  );

  // Use neutral style when respawn window is not open
  const effectiveStyle = windowStatus === "OPEN" ? style : WINDOW_CLOSED_STYLE;

  const hasPlayersToShow = playersOnMap.length > 0;

  return (
    <div
      className={cn(
        "p-2 rounded-lg border transition-colors",
        effectiveStyle.bg,
        effectiveStyle.border,
        windowStatus !== "OPEN" && "hover:border-primary",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Left side - Map info */}
        <div
          className={cn(
            "flex-1 min-w-0 flex items-center gap-2",
            hasPlayersToShow && "cursor-pointer",
          )}
          onClick={
            hasPlayersToShow ? () => setIsExpanded(!isExpanded) : undefined
          }
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasPlayersToShow && (
              <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="text-sm truncate">{map.mapName}</span>
            <span className="text-xs text-muted-foreground/60 font-mono shrink-0">
              #{map.mapId}
            </span>
            {hasPlayersToShow && (
              <ChevronDown
                className={cn(
                  "w-3 h-3 text-muted-foreground transition-transform shrink-0",
                  isExpanded && "rotate-180",
                )}
              />
            )}
          </div>

          {/* Assigned members avatar stack */}
          {memberCount > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex -space-x-1.5">
                {map.assignedMembers.slice(0, 3).map((member) => {
                  const memberPlayers = presenceData?.get(member.userId) || [];
                  const playerOnThisMap = memberPlayers.find(
                    (p) => p.mapName === map.mapName,
                  );
                  const isOnMap = !!playerOnThisMap;
                  const isAfk = playerOnThisMap?.isAfk ?? false;

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "w-5 h-5 rounded-full bg-muted border-2 flex items-center justify-center overflow-hidden",
                        windowStatus === "OPEN" && isOnMap && !isAfk
                          ? "border-green-500"
                          : windowStatus === "OPEN" && isAfk
                            ? "border-orange-500"
                            : "border-background",
                      )}
                      title={`${member.name}${isAfk ? " (AFK)" : isOnMap ? " (Online)" : ""}`}
                    >
                      <img
                        src={getDiscordAvatarUrl(
                          member.userId,
                          member.avatar,
                          32,
                        )}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  );
                })}
                {memberCount > 3 && (
                  <div className="w-5 h-5 rounded-full bg-primary/20 border border-background flex items-center justify-center text-[10px] font-medium text-primary">
                    +{memberCount - 3}
                  </div>
                )}
              </div>
              {memberCount === 1 && map.assignedMembers[0] ? (
                <MemberName
                  member={map.assignedMembers[0]}
                  className="text-xs"
                />
              ) : memberCount > 1 ? (
                <span className="text-xs text-muted-foreground">
                  {memberCount}
                </span>
              ) : null}
            </div>
          )}

          {/* Coverage gap timer - inline when collapsed */}
          {windowStatus === "OPEN" && gapType && formattedDuration && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help shrink-0">
                  <Clock
                    className={cn(
                      "w-3 h-3",
                      gapType === "UNASSIGNED"
                        ? "text-destructive"
                        : "text-yellow-500",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-mono",
                      gapType === "UNASSIGNED"
                        ? "text-destructive"
                        : "text-yellow-500",
                    )}
                  >
                    {formattedDuration}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {gapType === "UNASSIGNED"
                  ? t("events.maps.gap.unassignedTooltip")
                  : t("events.maps.gap.uncoveredTooltip")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Admin: Manage button */}
          {canManage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onManageClick?.(map.id)}
                    disabled={assignmentDisabled}
                  >
                    <Users className="w-3.5 h-3.5" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {assignmentDisabled
                  ? assignmentEnabledAt
                    ? t("events.maps.assignmentDisabledWithTime", {
                        time: formatTimeRemaining(assignmentEnabledAt),
                      })
                    : t("events.maps.assignmentDisabled")
                  : t("events.maps.manage", "Zarządzaj")}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Self-assign or Self-unassign */}
          {isAssignedToMe ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onSelfUnassignClick?.(map.id)}
              title={t("events.maps.unassignSelf")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 p-0 gap-1",
                      assignmentDisabled ? "w-auto px-1.5" : "w-7",
                    )}
                    onClick={() => onSelfAssignClick?.(map.id)}
                    disabled={assignmentDisabled}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {assignmentDisabled && assignmentEnabledAt && (
                      <span className="text-xs font-mono">
                        {formatTimeRemaining(assignmentEnabledAt)}
                      </span>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {assignmentDisabled
                  ? assignmentEnabledAt
                    ? t("events.maps.assignmentDisabledWithTime", {
                        time: formatTimeRemaining(assignmentEnabledAt),
                      })
                    : t("events.maps.assignmentDisabled")
                  : t("events.maps.assignSelf")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Expandable: Players currently on this map */}
      {isExpanded && playersOnMap.length > 0 && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
          {playersOnMap.slice(0, 5).map((player) => (
            <div key={player.sessionId} className="relative">
              <PlayerTile
                player={{
                  id: player.characterId,
                  name: player.name,
                  icon: player.icon,
                  lvl: Number(player.lvl),
                  prof: player.prof,
                }}
                className={player.isAfk ? "opacity-50" : ""}
              />
              {player.isAfk && (
                <div className="absolute -top-1 -right-1 z-10">
                  <AlertTriangle className="w-3 h-3 text-orange-500" />
                </div>
              )}
            </div>
          ))}
          {playersOnMap.length > 5 && (
            <span className="text-xs text-muted-foreground">
              +{playersOnMap.length - 5}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
