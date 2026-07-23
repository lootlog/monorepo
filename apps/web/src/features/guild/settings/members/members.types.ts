import type { MemberResponseDto as GuildMember } from "@lootlog/api-client/models/main/member-response-dto";

export type MembersStats = {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  onlineMembers: number;
  problematicMembers: number;
};

export type { GuildMember };
