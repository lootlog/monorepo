import { createApiClient } from "@lootlog/client/transport";
import type { GameGuildMember } from "@/types/guild-member";

export type Guild = {
  id: string;
  name: string;
  icon: string | null;
  vanityUrl?: string;
};

export type GuildMember = GameGuildMember;

const mapGuildMembersByUserId = (
  members: GuildMember[],
): Record<string, GuildMember> => {
  const membersByUserId: Record<string, GuildMember> = {};

  members.forEach((member) => {
    membersByUserId[member.userId] = member;
  });

  return membersByUserId;
};

export async function fetchGuildMembers(
  guildId: string,
): Promise<Record<string, GuildMember>> {
  const client = createApiClient("main");
  const members = await client.get<GuildMember[]>(
    `/guilds/${guildId}/members/summary`,
  );

  return mapGuildMembersByUserId(members);
}
