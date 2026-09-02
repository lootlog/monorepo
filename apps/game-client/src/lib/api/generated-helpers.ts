import { useGameStore } from "@/store/game.store";
import type {
  CreatePartyGatheringDtoCharacter,
  GuildResponseDtoOutput,
  MemberSummaryResponseDtoOutput,
  MemberResponseDto,
  MemberResponseDtoRolesItem,
  SoundSettingsResponseDto,
  TimerResponseDto,
} from "@lootlog/client/main";

import type { Guild } from "@/api/guilds.api";
import type { Npc } from "@/api/npcs.api";
import type { GuildMember } from "@/types/guild-member";
import type {
  NpcTypeSoundConfig,
  UserSoundSettings,
} from "@lootlog/schema/sound-settings";

export type GuildIdentity = Pick<
  GuildResponseDtoOutput,
  "id" | "name" | "icon" | "vanityUrl"
>;

const EMPTY_GUILD_IDS: string[] = [];
const EMPTY_GUILD_NAMES_BY_ID: Record<string, string> = {};
const guildIdsCache = new WeakMap<GuildIdentity[], string[]>();
const guildNamesByIdCache = new WeakMap<
  GuildIdentity[],
  Record<string, string>
>();

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const getNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  return fallback;
};

const getString = (value: unknown, fallback = "") => {
  return typeof value === "string" ? value : fallback;
};

export const getGuildIds = (guilds?: GuildIdentity[]) => {
  if (!guilds) return EMPTY_GUILD_IDS;

  const cachedGuildIds = guildIdsCache.get(guilds);
  if (cachedGuildIds) return cachedGuildIds;

  const guildIds = guilds.map((guild) => guild.id);
  guildIdsCache.set(guilds, guildIds);
  return guildIds;
};

export const normalizeGuild = (guild: GuildIdentity): Guild => {
  return {
    id: guild.id,
    name: guild.name,
    icon: guild.icon ?? null,
    ...(guild.vanityUrl ? { vanityUrl: guild.vanityUrl } : {}),
  };
};

export const normalizeGuilds = (guilds: GuildIdentity[] = []) => {
  return guilds.map(normalizeGuild);
};

export const getGuildNamesById = (guilds?: GuildIdentity[]) => {
  if (!guilds) return EMPTY_GUILD_NAMES_BY_ID;

  const cachedGuildNamesById = guildNamesByIdCache.get(guilds);
  if (cachedGuildNamesById) return cachedGuildNamesById;

  const guildNamesById = guilds.reduce<Record<string, string>>(
    (result, guild) => {
      result[guild.id] = guild.name;
      return result;
    },
    {},
  );
  guildNamesByIdCache.set(guilds, guildNamesById);
  return guildNamesById;
};

export const mapGuildMembersByUserId = (
  members: MemberSummaryResponseDtoOutput[] = [],
): Record<string, MemberSummaryResponseDtoOutput> => {
  return members.reduce<Record<string, MemberSummaryResponseDtoOutput>>(
    (result, member) => {
      result[member.userId] = member;
      return result;
    },
    {},
  );
};

export const normalizeTimerMemberRole = (role: MemberResponseDtoRolesItem) => {
  return {
    position: role.position ?? null,
    color: role.color ?? null,
  };
};

export const normalizeTimerMember = (
  member?: MemberResponseDto,
): GuildMember | undefined => {
  if (!member) {
    return undefined;
  }

  return {
    id: member.id,
    userId: member.userId,
    guildId: member.guildId,
    avatar: member.avatar ?? null,
    type: member.type,
    name: member.name,
    roles: member.roles.map(normalizeTimerMemberRole),
  };
};

export const normalizeTimerNpc = (npc: TimerResponseDto["npc"]): Npc => {
  const data: Record<string, unknown> = isRecord(npc) ? npc : {};

  return {
    id: getNumber(data.id),
    name: getString(data.name),
    lvl: getNumber(data.lvl),
    prof: getString(data.prof),
    icon: getString(data.icon),
    wt: getNumber(data.wt),
    type: getString(data.type, "NPC") as Npc["type"],
    location: typeof data.location === "string" ? data.location : undefined,
    margonemType: getNumber(data.margonemType),
  };
};

const normalizeSoundCategoryConfig = (
  value: unknown,
): Record<string, NpcTypeSoundConfig> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, NpcTypeSoundConfig>>(
    (result, [key, config]) => {
      if (!isRecord(config)) {
        return result;
      }

      result[key] = {
        volume: getNumber(config.volume, 0.5),
        soundUrl: getString(config.soundUrl),
      };

      return result;
    },
    {},
  );
};

export const normalizeSoundSettings = (
  settings: SoundSettingsResponseDto,
): UserSoundSettings => {
  return {
    userId: settings.userId,
    masterVolume: settings.masterVolume,
    notificationsVolume: settings.notificationsVolume,
    detectorVolume: settings.detectorVolume,
    timersVolume: settings.timersVolume,
    pingsVolume: settings.pingsVolume,
    notificationsConfig: normalizeSoundCategoryConfig(
      settings.notificationsConfig,
    ),
    detectorConfig: normalizeSoundCategoryConfig(settings.detectorConfig),
    timersConfig: normalizeSoundCategoryConfig(settings.timersConfig),
    createdAt: settings.createdAt ? new Date(settings.createdAt) : undefined,
    updatedAt: settings.updatedAt ? new Date(settings.updatedAt) : undefined,
  };
};

export const buildCurrentCharacterPayload = ():
  | CreatePartyGatheringDtoCharacter
  | undefined => {
  const hero = useGameStore.getState().game?.hero;
  if (!hero) return undefined;

  return {
    lvl: hero.level,
    nick: hero.name,
    accountId: hero.accountId,
    characterId: hero.characterId,
    prof: hero.profession,
    icon: hero.icon,
    clan: hero.clan ? { id: hero.clan.id, name: hero.clan.name } : undefined,
  };
};

export const buildCurrentTimerActorCharacterPayload = () => {
  const hero = useGameStore.getState().game?.hero;
  if (!hero) return undefined;

  return {
    accountId: hero.accountId,
    characterId: hero.characterId,
    name: hero.name,
    prof: hero.profession,
    icon: hero.icon,
    lvl: hero.level,
  };
};

export const buildChatCharacterData = () => {
  const hero = useGameStore.getState().game?.hero;
  if (!hero) return undefined;

  return {
    nick: hero.name,
    id: Number(hero.characterId),
    acc: Number(hero.accountId),
    lvl: hero.level,
    prof: hero.profession,
    icon: hero.icon,
  };
};
