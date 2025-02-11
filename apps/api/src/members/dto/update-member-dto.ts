import { MemberType } from '@prisma/client';

export class UpdateMemberDto {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  banner: string | null;
  globalName: string | null;
  guildId: string;
  name: string;
  roleIds: string[];
  type: MemberType;
}
