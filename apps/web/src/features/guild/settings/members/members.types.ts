import type { MemberResponseDto as GuildMember } from "@/lib/api/generated/main/model";

export type MembersStats = {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  onlineMembers: number;
  problematicMembers: number;
};

export type { GuildMember };
