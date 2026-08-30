import type { Guild, Npc, Timer, User } from "@/api";
import type { GuildMember } from "@/types/guild-member";
import type {
  PlayerPresence,
  PlayerPresenceResponse,
} from "@/lib/online-players-presence";
import type { GuildResponseDtoOutput } from "@lootlog/api-client/models/main/guild-response-dto-output";
import type {
  PublicGuild,
  PublicMember,
  PublicNpc,
  PublicOnlinePlayerPresence,
  PublicOnlinePlayers,
  PublicTimer,
  PublicUser,
} from "./types";

const mapOnlinePlayerPresence = (
  presence: PlayerPresence,
): PublicOnlinePlayerPresence => ({
  discordId: presence.discordId,
  sessionId: presence.sessionId,
  platform: presence.platform,
  status: presence.status,
  guildId: presence.guildId,
  mapName: presence.mapName,
  isAfk: presence.isAfk,
  margonemAccountVerified: presence.margonemAccountVerified,
  updatedAt: presence.updatedAt,
  player: presence.player
    ? {
        ...presence.player,
        clan: presence.player.clan ? { ...presence.player.clan } : undefined,
        location: presence.player.location
          ? { ...presence.player.location }
          : undefined,
      }
    : undefined,
});

export const mapOnlinePlayers = (
  players: PlayerPresenceResponse,
): PublicOnlinePlayers =>
  Object.fromEntries(
    Object.entries(players).map(([discordId, presences]) => [
      discordId,
      presences.map(mapOnlinePlayerPresence),
    ]),
  );

const mapUser = (user: User): PublicUser => ({
  avatar: user.avatar,
  banner: user.banner,
  discriminator: user.discriminator,
  globalName: user.globalName,
  id: user.id,
  username: user.username,
});

const mapMember = (member: GuildMember): PublicMember => ({
  id: member.id,
  userId: member.userId,
  guildId: member.guildId,
  avatar: member.avatar,
  type: member.type,
  name: member.name,
  user: member.user ? mapUser(member.user) : undefined,
  roles: member.roles?.map((r) => ({ position: r.position, color: r.color })),
});

const mapNpc = (npc: Npc): PublicNpc => ({
  id: npc.id,
  name: npc.name,
  lvl: npc.lvl,
  prof: npc.prof,
  icon: npc.icon,
  wt: npc.wt,
  type: npc.type,
  location: npc.location,
  margonemType: npc.margonemType,
});

const toIso = (value: Date | string | undefined | null): string | null => {
  if (value === undefined || value === null) return null;
  return new Date(value).toISOString();
};

const mapTimer = (timer: Timer): PublicTimer => {
  const primaryMember = timer.member ?? timer.members?.[0];

  return {
    timerKey: timer.timerKey,
    npcId: timer.npcId,
    npc: mapNpc(timer.npc),
    member: primaryMember
      ? mapMember(primaryMember)
      : {
          id: 0,
          userId: "",
          guildId: timer.guildId,
          type: "unknown",
          name: "",
        },
    members: timer.members?.map(mapMember),
    world: timer.world,
    guildId: timer.guildId,
    minSpawnTime: new Date(timer.minSpawnTime).toISOString(),
    maxSpawnTime: new Date(timer.maxSpawnTime).toISOString(),
    updatedAt: toIso(timer.updatedAt),
    isCustomTime: timer.isCustomTime,
    isPending: timer.isPending,
    wasReset: timer.wasReset,
  };
};

export const mapGuilds = (
  data: Array<Guild | GuildResponseDtoOutput> | undefined,
): PublicGuild[] | undefined => {
  if (!data) return undefined;
  return data.map(
    (g): PublicGuild => ({
      id: g.id,
      name: g.name,
      icon: g.icon ?? null,
      vanityUrl: g.vanityUrl ?? undefined,
    }),
  );
};

export const mapTimers = (
  data: Timer[] | undefined,
): PublicTimer[] | undefined => {
  if (!data) return undefined;
  return data.map(mapTimer);
};

export const groupTimersByGuild = (
  timers: PublicTimer[],
): Map<string, PublicTimer[]> => {
  const grouped = new Map<string, PublicTimer[]>();
  for (const timer of timers) {
    const existing = grouped.get(timer.guildId);
    if (existing) {
      existing.push(timer);
    } else {
      grouped.set(timer.guildId, [timer]);
    }
  }
  return grouped;
};
