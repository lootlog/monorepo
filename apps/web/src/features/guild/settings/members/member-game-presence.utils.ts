import type { PlayerPresence } from "@/features/guild/events/hooks/socket/use-event-presence";
import type { MemberActivityStats } from "@/features/guild/settings/members/member-activity-stats-api";

export type MemberGamePresenceByDiscordId = Map<string, PlayerPresence[]>;
export type MemberGamePresenceGuild = {
  id?: string | null;
};

export type MemberGamePresenceUpdatePayload = {
  guildId: string;
  discordId: string;
  sessionId?: string;
  player?: PlayerPresence;
  disconnected?: boolean;
  status?: "online" | "offline";
};

export const mapMemberGamePresenceByDiscordId = (
  players: Record<string, PlayerPresence[]> | undefined,
): MemberGamePresenceByDiscordId => {
  const presenceByDiscordId: MemberGamePresenceByDiscordId = new Map();

  for (const [discordId, presence] of Object.entries(players ?? {})) {
    if (presence.length > 0) {
      presenceByDiscordId.set(discordId, presence);
    }
  }

  return presenceByDiscordId;
};

export const resolveMemberPresenceGuildId = (
  guild: MemberGamePresenceGuild | undefined,
) => guild?.id ?? undefined;

export const applyMemberGamePresenceUpdate = (
  presenceByDiscordId: MemberGamePresenceByDiscordId | undefined,
  payload: MemberGamePresenceUpdatePayload,
): MemberGamePresenceByDiscordId => {
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

export const isMemberOnlineInGame = (
  presenceByDiscordId: MemberGamePresenceByDiscordId | undefined,
  discordId: string,
) => (presenceByDiscordId?.get(discordId)?.length ?? 0) > 0;

export const isMemberGamePresenceVerified = (
  presenceByDiscordId: MemberGamePresenceByDiscordId | undefined,
  discordId: string,
) =>
  presenceByDiscordId
    ?.get(discordId)
    ?.some((presence) => presence.margonemAccountVerified === true) ?? false;

export const getMemberGameSessionCount = (
  presenceByDiscordId: MemberGamePresenceByDiscordId | undefined,
  discordId: string,
) => presenceByDiscordId?.get(discordId)?.length ?? 0;

export const getMemberOnlineSources = ({
  activityStats,
  gamePresenceByDiscordId,
  discordId,
}: {
  activityStats?: MemberActivityStats;
  gamePresenceByDiscordId?: MemberGamePresenceByDiscordId;
  discordId: string;
}) => {
  const web = (activityStats?.activeSessionCount ?? 0) > 0;
  const game = isMemberOnlineInGame(gamePresenceByDiscordId, discordId);

  return {
    web,
    game,
    online: web || game,
  };
};
