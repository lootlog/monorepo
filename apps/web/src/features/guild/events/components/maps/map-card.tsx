import { useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { UserPlus, X, AlertTriangle, Users, ChevronDown } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { PlayerTile } from "@/components/tiles";
import { useAssignmentCountdown } from "../../hooks/utils/use-assignment-countdown";
import type { EventMap } from "../../types/api";
import type { PlayerPresence } from "../../hooks/socket/use-event-presence";
import {
  isWindowActive,
  type WindowStatus,
} from "../../hooks/use-window-status";
import type { CoverageGap } from "../../hooks/queries/use-map-coverage-timer";
import { MapCoverageTimer } from "./map-coverage-timer";

export type MapStatus =
  | "ASSIGNED_PRESENT"
  | "ASSIGNED_ABSENT"
  | "ASSIGNED_AFK"
  | "ASSIGNED_UNKNOWN"
  | "UNASSIGNED";

export const STATUS_STYLES: Record<MapStatus, { bg: string }> = {
  ASSIGNED_PRESENT: {
    bg: "bg-green-500/10",
  },
  ASSIGNED_ABSENT: {
    bg: "bg-orange-500/10",
  },
  ASSIGNED_AFK: {
    bg: "bg-orange-500/10",
  },
  ASSIGNED_UNKNOWN: {
    bg: "bg-orange-500/10",
  },
  UNASSIGNED: {
    bg: "bg-destructive/10",
  },
};

const WINDOW_CLOSED_STYLE = {
  bg: "bg-muted/50",
};

const getPlayersOnMap = (
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

  if (!presenceData) {
    return "ASSIGNED_UNKNOWN";
  }

  if (presenceData.size === 0) {
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

  const { isEnabled: isAssignmentEnabled, formattedTime: countdownTime } =
    useAssignmentCountdown(assignmentDisabled, assignmentEnabledAt);

  const effectiveStyle = isWindowActive(windowStatus)
    ? style
    : WINDOW_CLOSED_STYLE;

  const hasPlayersToShow = playersOnMap.length > 0;
  const manageActionLabel = t("events.maps.manageShort");
  let assignmentTooltipContent = t("events.maps.assignSelf");
  if (!isAssignmentEnabled) {
    if (assignmentDisabledMessage) {
      assignmentTooltipContent = assignmentDisabledMessage;
    } else if (countdownTime) {
      assignmentTooltipContent = t("events.maps.assignmentDisabledWithTime", {
        time: countdownTime,
      });
    } else {
      assignmentTooltipContent = t("events.maps.assignmentDisabled");
    }
  }

  const handleRowDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isAssignmentEnabled) return;

    const target = event.target;
    if (target instanceof Element && target.closest("[data-map-row-actions]")) {
      return;
    }

    if (isAssignedToMe) {
      onSelfUnassignClick?.(map.id);
      return;
    }

    onSelfAssignClick?.(map.id);
  };

  return (
    <div
      className={cn("transition-colors", effectiveStyle.bg)}
      data-map-card={map.id}
    >
      <div
        className={cn(
          "grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-2",
          isAssignmentEnabled && "cursor-pointer",
        )}
        onDoubleClick={handleRowDoubleClick}
      >
        <div className="col-start-1 row-start-1 flex h-5 min-w-0 items-center gap-2">
          {hasPlayersToShow ? (
            <button
              type="button"
              onClick={() => setIsExpanded((expanded) => !expanded)}
              className="flex min-w-0 items-center gap-1.5 text-left"
              aria-expanded={isExpanded}
            >
              <span className="truncate text-sm font-semibold">
                {map.mapName}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground/70">
                #{map.mapId}
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180",
                )}
              />
            </button>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-semibold">
                {map.mapName}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground/70">
                #{map.mapId}
              </span>
            </span>
          )}

          <MapCoverageTimer
            mapId={map.id}
            status={status}
            activeGap={activeGap}
            windowStatus={windowStatus}
          />
        </div>

        <div
          className="col-start-1 row-start-2 mt-1 flex h-5 min-w-0 items-center gap-2"
          data-map-assignment-row
        >
          {memberCount > 0 ? (
            <>
              <div className="flex shrink-0 -space-x-1.5">
                {displayedAssignedMembers.map((member) => {
                  const memberPlayers = presenceData?.get(member.userId) ?? [];
                  const playerOnThisMap = memberPlayers.find(
                    (player) => player.mapName === map.mapName,
                  );
                  const isOnMap = Boolean(playerOnThisMap);
                  const isAfk = playerOnThisMap?.isAfk ?? false;

                  let avatarBorderClassName = "border-background";
                  if (isWindowActive(windowStatus) && isOnMap && !isAfk) {
                    avatarBorderClassName = "border-green-500";
                  } else if (isWindowActive(windowStatus) && isAfk) {
                    avatarBorderClassName = "border-orange-500";
                  }

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "flex size-5 items-center justify-center overflow-hidden rounded-full border-2 bg-muted",
                        avatarBorderClassName,
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
                        className="size-full object-cover"
                      />
                    </div>
                  );
                })}
                {memberCount > 3 && (
                  <div className="flex size-5 items-center justify-center rounded-full border border-background bg-primary/20 text-[10px] font-medium text-primary">
                    +{memberCount - 3}
                  </div>
                )}
              </div>
              <span
                className="min-w-0 truncate text-xs font-medium text-foreground/80"
                title={assignedMembers.map((member) => member.name).join(", ")}
              >
                {displayedAssignedMembers
                  .map((member) => member.name)
                  .join(", ")}
                {memberCount > 3 ? ` +${memberCount - 3}` : ""}
              </span>
            </>
          ) : (
            <span className="truncate text-xs font-semibold text-destructive">
              {t("events.maps.gap.unassigned")}
            </span>
          )}
        </div>

        <div
          className="col-start-2 row-span-2 row-start-1 flex shrink-0 items-center gap-1"
          data-map-row-actions
          onDoubleClick={(event) => event.stopPropagation()}
        >
          {canManage && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9"
                      onClick={() => onManageClick?.(map.id)}
                      disabled={!isAssignmentEnabled}
                      aria-label={manageActionLabel}
                    >
                      <Users className="size-4" />
                    </Button>
                  </span>
                }
              />
              <TooltipContent>
                {isAssignmentEnabled
                  ? manageActionLabel
                  : assignmentTooltipContent}
              </TooltipContent>
            </Tooltip>
          )}

          {isAssignedToMe ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onSelfUnassignClick?.(map.id)}
                    aria-label={t("events.maps.unassignSelf")}
                  >
                    <X className="size-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("events.maps.unassignSelf")}</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9"
                      onClick={() => onSelfAssignClick?.(map.id)}
                      disabled={!isAssignmentEnabled}
                      aria-label={t("events.maps.assignSelf")}
                    >
                      <UserPlus className="size-4" />
                    </Button>
                  </span>
                }
              />
              <TooltipContent>{assignmentTooltipContent}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {isExpanded && playersOnMap.length > 0 && (
        <div className="flex items-center gap-1 border-t border-border/50 px-3 py-2">
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
                <div className="absolute -right-1 -top-1 z-10">
                  <AlertTriangle className="size-3 text-orange-500" />
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
