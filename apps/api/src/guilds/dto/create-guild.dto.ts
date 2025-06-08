import { MemberType } from 'generated/client';

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
  members: GuildMemberDto[];
  roles: GuildRoleDto[];
  ownerId: string;
}
