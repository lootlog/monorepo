import { isPlainObject } from "es-toolkit";
import { useGameStore } from "@/store/game.store";
import type {
  CreatePartyGatheringDtoCharacter,
  GuildResponseDtoOutput,
  MemberSummaryResponseDtoOutput,
  MemberResponseDto,
  MemberResponseDtoRolesItem,
  TimerResponseDto,
} from "@lootlog/client/main";
import type { Npc } from "@/api/npcs.api";
import type { GuildMember } from "@/types/guild-member";

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

export const getNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isNaN(parsed) ? fallback : parsed;
  }

  return fallback;
};

export const getString = (value: unknown, fallback = "") => {
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

const EMPTY_GUILD_MEMBERS_BY_USER_ID: Record<
  string,
  MemberSummaryResponseDtoOutput
> = {};

const guildMembersByUserIdCache = new WeakMap<
  MemberSummaryResponseDtoOutput[],
  Record<string, MemberSummaryResponseDtoOutput>
>();

export const mapGuildMembersByUserId = (
  members?: MemberSummaryResponseDtoOutput[],
) => {
  if (!members) return EMPTY_GUILD_MEMBERS_BY_USER_ID;
  const cachedMembersByUserId = guildMembersByUserIdCache.get(members);

  if (cachedMembersByUserId) return cachedMembersByUserId;

  const membersByUserId = members.reduce<
    Record<string, MemberSummaryResponseDtoOutput>
  >((result, member) => {
    result[member.userId] = member;

    return result;
  }, {});

  guildMembersByUserIdCache.set(members, membersByUserId);

  return membersByUserId;
};

const normalizeTimerMemberRole = (role: MemberResponseDtoRolesItem) => {
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
  const data = isPlainObject(npc) ? npc : undefined;

  return {
    id: getNumber(data?.id),
    name: getString(data?.name),
    lvl: getNumber(data?.lvl),
    prof: getString(data?.prof),
    icon: getString(data?.icon),
    wt: getNumber(data?.wt),
    type: typeof data?.type === "string" ? data.type : "NPC",
    location: typeof data?.location === "string" ? data.location : undefined,
    margonemType: getNumber(data?.margonemType),
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

export const buildCurrentTimerActorCharacterPayload = (world: string) => {
  const game = useGameStore.getState().game;

  if (!game || game.world !== world) return undefined;

  const { hero } = game;

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
