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
import { useAssignmentCountdown } from "../../hooks/utils/use-assignment-countdown";
import type { EventMap } from "../../types/api";
import type { PlayerPresence } from "../../hooks/socket/use-event-presence";
import {
  isWindowActive,
  type WindowStatus,
} from "../../hooks/use-window-status";
import type { CoverageGap } from "../../hooks/queries/use-map-coverage-timer";

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

  const playersOnMap = getPlayersOnMap(map.mapName, presenceData);

  const hasActivePlayer = playersOnMap.some((p) => !p.isAfk);
  if (hasActivePlayer) {
    return "ASSIGNED_PRESENT";
  }

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
  assignmentDisabledMessage?: string | null;
  onSelfAssignClick?: (mapId: string) => void;
  onSelfUnassignClick?: (mapId: string) => void;
  onManageClick?: (mapId: string) => void;
  windowStatus?: WindowStatus;
  activeGap?: CoverageGap | null;
}

export const MapCard = ({
  map,
  status,
  style,
  canManage,
  currentMemberId,
  presenceData,
  assignmentDisabled,
  assignmentEnabledAt,
  assignmentDisabledMessage,
  onSelfAssignClick,
  onSelfUnassignClick,
  onManageClick,
  windowStatus = "OPEN",
  activeGap,
}: MapCardProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const assignedMembers = map.assignedMembers ?? [];
  const memberCount = assignedMembers.length;
  const isAssignedToMe = assignedMembers.some((m) => m.id === currentMemberId);
  const displayedAssignedMembers = assignedMembers.slice(0, 3);
  const playersOnMap = getPlayersOnMap(map.mapName, presenceData);

  const initialStartedAt = activeGap?.startedAt
    ? new Date(activeGap.startedAt)
    : null;

  const { gapType, formattedDuration } = useLocalCoverageTimer(
    status,
    initialStartedAt,
  );

  const { isEnabled: isAssignmentEnabled, formattedTime: countdownTime } =
    useAssignmentCountdown(assignmentDisabled, assignmentEnabledAt);

  const effectiveStyle = isWindowActive(windowStatus)
    ? style
    : WINDOW_CLOSED_STYLE;

  const hasPlayersToShow = playersOnMap.length > 0;
  const manageActionLabel = t("events.maps.manageShort");
  const assignActionLabel =
    !isAssignmentEnabled && countdownTime
      ? countdownTime
      : t("events.maps.assignSelf");
  const actionsGridClassName = canManage ? "grid-cols-2" : "grid-cols-1";

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        effectiveStyle.bg,
        effectiveStyle.border,
        !isWindowActive(windowStatus) && "hover:border-primary",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "flex min-w-0 items-center gap-2",
              hasPlayersToShow && "cursor-pointer",
            )}
            onClick={
              hasPlayersToShow ? () => setIsExpanded(!isExpanded) : undefined
            }
          >
            <div className="min-w-0 flex items-center gap-1.5">
              {hasPlayersToShow && (
                <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate text-sm font-medium">
                {map.mapName}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground/60">
                #{map.mapId}
              </span>
              {hasPlayersToShow && (
                <ChevronDown
                  className={cn(
                    "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180",
                  )}
                />
              )}

              {memberCount > 0 && (
                <div className="flex shrink-0 items-center gap-1.5 ml-1">
                  <div className="flex -space-x-1.5 shrink-0">
                    {displayedAssignedMembers.map((member) => {
                      const memberPlayers =
                        presenceData?.get(member.userId) || [];
                      const playerOnThisMap = memberPlayers.find(
                        (p) => p.mapName === map.mapName,
                      );
                      const isOnMap = !!playerOnThisMap;
                      const isAfk = playerOnThisMap?.isAfk ?? false;

                      return (
                        <div
                          key={member.id}
                          className={cn(
                            "flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border-2 bg-muted",
                            isWindowActive(windowStatus) && isOnMap && !isAfk
                              ? "border-green-500"
                              : isWindowActive(windowStatus) && isAfk
                                ? "border-orange-500"
                                : "border-background",
                          )}
                        >
                          {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
                          <img
                            src={getDiscordAvatarUrl(
                              member.userId,
                              member.avatar,
                              32,
                            )}
                            alt={member.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      );
                    })}
                    {memberCount > 3 && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-background bg-primary/20 text-[10px] font-medium text-primary">
                        +{memberCount - 3}
                      </div>
                    )}
                  </div>
                  <span
                    className="min-w-0 truncate text-xs text-muted-foreground"
                    title={assignedMembers
                      .map((member) => member.name)
                      .join(", ")}
                  >
                    {displayedAssignedMembers
                      .map((member) => member.name)
                      .join(", ")}
                    {memberCount > 3 ? ` +${memberCount - 3}` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {isWindowActive(windowStatus) && gapType && formattedDuration && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex shrink-0 cursor-help items-center gap-1">
                <Clock
                  className={cn(
                    "h-3 w-3",
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

        <div
          className={cn(
            "grid w-full shrink-0 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-1",
            actionsGridClassName,
          )}
        >
          {canManage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full justify-center gap-2 px-3 sm:h-7 sm:w-7 sm:px-0"
                    onClick={() => onManageClick?.(map.id)}
                    disabled={!isAssignmentEnabled}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-xs sm:hidden">
                      {manageActionLabel}
                    </span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {!isAssignmentEnabled
                  ? assignmentDisabledMessage
                    ? assignmentDisabledMessage
                    : countdownTime
                      ? t("events.maps.assignmentDisabledWithTime", {
                          time: countdownTime,
                        })
                      : t("events.maps.assignmentDisabled")
                  : manageActionLabel}
              </TooltipContent>
            </Tooltip>
          )}

          {isAssignedToMe ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full justify-center gap-2 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-7 sm:w-7 sm:px-0"
              onClick={() => onSelfUnassignClick?.(map.id)}
              title={t("events.maps.unassignSelf")}
            >
              <X className="h-3.5 w-3.5" />
              <span className="text-xs sm:hidden">
                {t("events.maps.unassignSelf")}
              </span>
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 w-full justify-center gap-2 px-3 sm:h-7 sm:px-0 sm:w-7",
                    )}
                    onClick={() => onSelfAssignClick?.(map.id)}
                    disabled={!isAssignmentEnabled}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span className="text-xs sm:hidden">
                      {assignActionLabel}
                    </span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {!isAssignmentEnabled
                  ? assignmentDisabledMessage
                    ? assignmentDisabledMessage
                    : countdownTime
                      ? t("events.maps.assignmentDisabledWithTime", {
                          time: countdownTime,
                        })
                      : t("events.maps.assignmentDisabled")
                  : t("events.maps.assignSelf")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

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
