import { MemberType } from '@prisma/client';

export class GuildMemberDto {
  id: string;
  roleIds: string[];
  type: MemberType;
  discriminator: string;
  banner: string;
  globalName: string;
  username: string;
  avatar: string;
  displayName: string;
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
