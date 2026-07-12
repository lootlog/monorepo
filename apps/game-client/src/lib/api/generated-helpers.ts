import { Game } from "@/lib/game";
import type {
  CreatePartyGatheringDtoCharacter,
  GuildResponseDtoOutput,
  MemberSummaryResponseDtoOutput,
  MemberResponseDto,
  MemberResponseDtoRolesItem,
  SoundSettingsResponseDto,
  TimerResponseDto,
} from "@/lib/api/generated/main/model";
import type { Guild } from "@/api/guilds.api";
import type { Npc } from "@/api/npcs.api";
import type { GuildMember } from "@/types/guild-member";
import type { NpcTypeSoundConfig, UserSoundSettings } from "@lootlog/types";

export type GuildIdentity = Pick<
  GuildResponseDtoOutput,
  "id" | "name" | "icon" | "vanityUrl"
>;

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
  return guilds?.map((guild) => guild.id) ?? [];
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
  return (
    guilds?.reduce<Record<string, string>>((result, guild) => {
      result[guild.id] = guild.name;
      return result;
    }, {}) ?? {}
  );
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

export const buildCurrentCharacterPayload =
  (): CreatePartyGatheringDtoCharacter => {
    const hero = Game.hero;

    return {
      lvl: hero.lvl,
      nick: hero.nick,
      accountId: String(hero.account),
      characterId: String(hero.id),
      prof: hero.prof,
      icon: hero.img,
      clan: hero.clan ? { id: hero.clan.id, name: hero.clan.name } : undefined,
    };
  };

export const buildCurrentTimerActorCharacterPayload = () => {
  const hero = Game.hero;

  return {
    accountId: String(hero.account),
    characterId: String(hero.id),
    name: hero.nick,
    prof: hero.prof,
    icon: hero.img,
    lvl: hero.lvl,
  };
};

export const buildChatCharacterData = () => {
  const hero = Game.hero;

  return {
    nick: hero.nick,
    id: hero.id,
    acc: hero.account,
    lvl: hero.lvl,
    prof: hero.prof,
    icon: hero.img,
  };
};
