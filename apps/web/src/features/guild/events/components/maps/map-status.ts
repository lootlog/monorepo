import type { EventMap } from "../../types/api";
import type { PlayerPresence } from "@/lib/gateway-client";

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

export const WINDOW_CLOSED_STYLE = {
  bg: "bg-muted/50",
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
