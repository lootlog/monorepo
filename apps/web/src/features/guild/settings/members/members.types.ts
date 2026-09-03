import type { MemberResponseDto as GuildMember } from "@lootlog/client/main";

export type MembersStats = {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  onlineMembers: number;
  problematicMembers: number;
};

export type { GuildMember };
