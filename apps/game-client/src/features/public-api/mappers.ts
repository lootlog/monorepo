import { groupByToMap } from "@/lib/group-by-to-map";
import type { Guild } from "@/api/guilds.api";
import type { Npc } from "@/api/npcs.api";
import type { Timer } from "@/api/timers.api";
import type { User } from "@/api/users.api";
import type { GuildMember } from "@/types/guild-member";
import type {
  PlayerPresence,
  PlayerPresenceResponse,
} from "@/lib/online-players-presence";
import type { GuildResponseDtoOutput } from "@lootlog/client/main";
import type {
  PublicGuild,
  PublicMember,
  PublicNpc,
  PublicOnlinePlayer,
  PublicOnlinePlayers,
  PublicTimer,
  PublicUser,
} from "@lootlog/game-client-api";

// Add-ons only display who is online, so presence leaves without account,
// session or user identifiers, and in name order rather than grouped by user.
const toPublicOnlinePlayer = (
  presence: PlayerPresence,
): PublicOnlinePlayer | undefined => {
  const { player } = presence;

  if (!player) return undefined;

  return {
    world: player.world,
    name: player.name,
    lvl: player.lvl,
    icon: player.icon,
    prof: player.prof,
    clan: player.clan ? { ...player.clan } : undefined,
    location: player.location ? { ...player.location } : undefined,
    mapName: presence.mapName,
    isAfk: presence.isAfk,
    margonemAccountVerified: presence.margonemAccountVerified,
    updatedAt: presence.updatedAt,
  };
};

export const mapOnlinePlayers = (
  players: PlayerPresenceResponse,
): PublicOnlinePlayers =>
  Object.values(players)
    .flat()
    .flatMap((presence) => toPublicOnlinePlayer(presence) ?? [])
    .toSorted(
      (left, right) =>
        left.name.localeCompare(right.name, "pl") || left.lvl - right.lvl,
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
    entranceClosesAt: toIso(timer.entranceClosesAt),
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

  return data.map((g): PublicGuild => ({
    id: g.id,
    name: g.name,
    icon: g.icon ?? null,
    vanityUrl: g.vanityUrl ?? undefined,
  }));
};

export const mapTimers = (
  data: Timer[] | undefined,
): PublicTimer[] | undefined => {
  if (!data) return undefined;

  return data.map(mapTimer);
};

export const groupTimersByGuild = (
  timers: PublicTimer[],
): Map<string, PublicTimer[]> => groupByToMap(timers, (timer) => timer.guildId);
