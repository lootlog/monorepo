import { getApiClient } from "@/lib/api-client";
import type { Permission } from "@lootlog/types";
import type { GameGuildMember } from "@/types/guild-member";

export type Guild = {
  id: string;
  name: string;
  icon: string | null;
  vanityUrl?: string;
};

export async function fetchGuild(guildId: string): Promise<Guild> {
  const client = getApiClient("default");
  const response = await client.get<Guild>(`/guilds/${guildId}`);

  return response.data;
}

export async function fetchGuilds(): Promise<Guild[]> {
  const client = getApiClient("default");
  const response = await client.get<Guild[]>("/guilds/@me?source=game", {
    withCredentials: true,
  });

  return response.data;
}

export type GuildMember = GameGuildMember;

export const mapGuildMembersByUserId = (
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
  const client = getApiClient("default");
  const response = await client.get<GuildMember[]>(
    `/guilds/${guildId}/members/summary`,
  );

  return mapGuildMembersByUserId(response.data);
}

export async function fetchGuildPermissions(
  guildId: string,
): Promise<Permission[]> {
  const client = getApiClient("default");
  const response = await client.get<Permission[]>(
    `/guilds/${guildId}/permissions`,
  );

  return response.data;
}

export async function fetchGuildWorlds(guildId: string): Promise<string[]> {
  const client = getApiClient("default");
  const response = await client.get<string[]>(`/guilds/${guildId}/worlds`);

  return response.data;
}
