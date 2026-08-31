import { db as prismaDb } from "../../prisma/db.js";
const MemberType = prismaDb.nativeEnums.public.MemberType.members;
type MemberType = (typeof MemberType)[keyof typeof MemberType];

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
