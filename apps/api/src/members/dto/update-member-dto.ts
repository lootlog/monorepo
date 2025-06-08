import { MemberType } from 'generated/client';

export class UpdateMemberDto {
  id: string;
  name: string;
  avatar: string | null;
  banner: string | null;
  guildId: string;
  roleIds: string[];
  type: MemberType;
}
