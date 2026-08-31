import type { Contract } from "../../prisma/contract.js";

type MemberType =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["MemberType"]["values"][number];

export class GuildMemberDto {
  id: string;
  roleIds: string[];
  type: MemberType;
  banner?: string;
  avatar?: string;
  name: string;
}

export class GuildRoleDto {
  id: string;
  name: string;
  color: number;
  admin: boolean;
  position: number;
}
export class CreateGuildDto {
  guildId: string;
  name: string;
  icon: string;
  roles: GuildRoleDto[];
  ownerId: string;
}
