import {
  useMembersControllerGetGuildMemberReferences,
  type MemberReferenceResponseDtoOutput as GuildMemberReference,
} from "@lootlog/client/main";

const MEMBER_REFERENCES_PARAMS = { includeInactive: true };

/** The key a record stores for its member; which one depends on the record. */
export type GuildMemberKey =
  | { discordId: string }
  | { memberId: number }
  | { userId: string };

type GuildMemberDirectory = {
  byDiscordId: ReadonlyMap<string, GuildMemberReference>;
  byMemberId: ReadonlyMap<number, GuildMemberReference>;
  byUserId: ReadonlyMap<string, GuildMemberReference>;
};

const EMPTY_DIRECTORY: GuildMemberDirectory = {
  byDiscordId: new Map(),
  byMemberId: new Map(),
  byUserId: new Map(),
};

const toDirectory = (
  members: GuildMemberReference[],
): GuildMemberDirectory => ({
  byDiscordId: new Map(members.map((member) => [member.userId, member])),
  byMemberId: new Map(members.map((member) => [member.id, member])),
  byUserId: new Map(
    members.flatMap((member) =>
      member.globalUserId ? [[member.globalUserId, member] as const] : [],
    ),
  ),
});

/**
 * Every member of the Organization, including those who already left, so old
 * entries keep their name and colour.
 */
export const useGuildMemberDirectory = (guildId: string | undefined) => {
  const { data } = useMembersControllerGetGuildMemberReferences(
    { guildId: guildId ?? "" },
    MEMBER_REFERENCES_PARAMS,
    { query: { enabled: Boolean(guildId), select: toDirectory } },
  );

  return data ?? EMPTY_DIRECTORY;
};

export const findGuildMember = (
  directory: GuildMemberDirectory,
  key: GuildMemberKey,
) => {
  if ("discordId" in key) return directory.byDiscordId.get(key.discordId);

  if ("memberId" in key) return directory.byMemberId.get(key.memberId);

  return directory.byUserId.get(key.userId);
};

/** Members by Discord id. */
export const useGuildMemberMap = (guildId: string | undefined) =>
  useGuildMemberDirectory(guildId).byDiscordId;
