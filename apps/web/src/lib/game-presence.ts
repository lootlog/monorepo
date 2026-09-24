import type { PlayerPresence } from "@/lib/gateway-client";

export type GamePresenceUpdatePayload = {
  guildId: string;
  discordId: string;
  sessionId?: string;
  player?: PlayerPresence;
  disconnected?: boolean;
  status?: "online" | "offline";
};

export const applyGamePresenceUpdate = (
  presenceByDiscordId: Map<string, PlayerPresence[]> | undefined,
  payload: GamePresenceUpdatePayload,
): Map<string, PlayerPresence[]> => {
  const nextPresenceByDiscordId = new Map(presenceByDiscordId ?? []);
  const { discordId, sessionId, player, disconnected, status } = payload;
  const disconnectedSessionId = sessionId ?? player?.sessionId;

  if ((disconnected || status === "offline") && disconnectedSessionId) {
    const existingPresence = nextPresenceByDiscordId.get(discordId) ?? [];

    const filteredPresence = existingPresence.filter(
      (presence) => presence.sessionId !== disconnectedSessionId,
    );

    if (filteredPresence.length === 0) {
      nextPresenceByDiscordId.delete(discordId);
    } else {
      nextPresenceByDiscordId.set(discordId, filteredPresence);
    }

    return nextPresenceByDiscordId;
  }

  if (!player) {
    return nextPresenceByDiscordId;
  }

  const existingPresence = nextPresenceByDiscordId.get(discordId) ?? [];

  const existingIndex = existingPresence.findIndex(
    (presence) => presence.sessionId === player.sessionId,
  );

  if (existingIndex >= 0) {
    const updatedPresence = [...existingPresence];
    updatedPresence[existingIndex] = player;
    nextPresenceByDiscordId.set(discordId, updatedPresence);
  } else {
    nextPresenceByDiscordId.set(discordId, [...existingPresence, player]);
  }

  return nextPresenceByDiscordId;
};

export const mapMemberGamePresenceByDiscordId = (
  players: Record<string, PlayerPresence[]> | undefined,
): Map<string, PlayerPresence[]> => {
  const presenceByDiscordId: Map<string, PlayerPresence[]> = new Map();

  for (const [discordId, presence] of Object.entries(players ?? {})) {
    if (presence.length > 0) {
      presenceByDiscordId.set(discordId, presence);
    }
  }

  return presenceByDiscordId;
};
