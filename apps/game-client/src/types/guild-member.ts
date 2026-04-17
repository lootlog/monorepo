import type { User } from "@/api";

type GuildMemberRole = {
  position: number | null;
  color: number | null;
};

export type GameGuildMember = {
  id: number;
  userId: string;
  name: string;
  avatar?: string | null;
  color?: number | null;
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
