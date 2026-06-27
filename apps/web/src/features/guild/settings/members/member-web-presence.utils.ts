export type MemberWebPresenceSession = {
  sessionId: string;
};

export type MemberWebPresenceByDiscordId = Map<string, Set<string>>;

export type MemberWebPresenceUpdatePayload = {
  guildId: string;
  discordId: string;
  sessionId?: string;
  status: "online" | "offline";
};

export const mapMemberWebPresenceByDiscordId = (
  sessions: Record<string, MemberWebPresenceSession[]> | undefined,
): MemberWebPresenceByDiscordId => {
  const presenceByDiscordId: MemberWebPresenceByDiscordId = new Map();

  for (const [discordId, memberSessions] of Object.entries(sessions ?? {})) {
    const sessionIds = memberSessions
      .map((session) => session.sessionId)
      .filter((sessionId) => sessionId.length > 0);

    if (sessionIds.length > 0) {
      presenceByDiscordId.set(discordId, new Set(sessionIds));
    }
  }

  return presenceByDiscordId;
};

export const applyMemberWebPresenceUpdate = (
  presenceByDiscordId: MemberWebPresenceByDiscordId | undefined,
  payload: MemberWebPresenceUpdatePayload,
): MemberWebPresenceByDiscordId => {
  const nextPresenceByDiscordId = new Map(presenceByDiscordId ?? []);
  const { discordId, sessionId, status } = payload;

  if (!sessionId) {
    return nextPresenceByDiscordId;
  }

  if (status === "offline") {
    const existingSessions = nextPresenceByDiscordId.get(discordId);
    if (!existingSessions) {
      return nextPresenceByDiscordId;
    }

    const nextSessions = new Set(existingSessions);
    nextSessions.delete(sessionId);

    if (nextSessions.size === 0) {
      nextPresenceByDiscordId.delete(discordId);
    } else {
      nextPresenceByDiscordId.set(discordId, nextSessions);
    }

    return nextPresenceByDiscordId;
  }

  const nextSessions = new Set(nextPresenceByDiscordId.get(discordId) ?? []);
  nextSessions.add(sessionId);
  nextPresenceByDiscordId.set(discordId, nextSessions);

  return nextPresenceByDiscordId;
};

export const isMemberOnlineOnWeb = (
  presenceByDiscordId: MemberWebPresenceByDiscordId | undefined,
  discordId: string,
) => (presenceByDiscordId?.get(discordId)?.size ?? 0) > 0;

export const getMemberWebSessionCount = (
  presenceByDiscordId: MemberWebPresenceByDiscordId | undefined,
  discordId: string,
) => presenceByDiscordId?.get(discordId)?.size ?? 0;
