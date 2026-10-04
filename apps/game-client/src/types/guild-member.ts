import type { User } from "@/api/users.api";

type GuildMemberRole = {
  position: number | null;
  color: number | null;
};

export type GuildMember = {
  id: number;
  userId: string;
  guildId: string;
  avatar?: string | null;
  type: string;
  name: string;
  user?: User;
  roles?: GuildMemberRole[];
};
