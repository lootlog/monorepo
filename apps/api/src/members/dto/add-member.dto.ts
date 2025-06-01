import { MemberType } from '@prisma/client';

export class AddMemberDto {
  id: string;
  avatar: string | null;
  banner: string | null;
  name: string;
  guildId: string;
  roleIds: string[];
  type: MemberType;
}
