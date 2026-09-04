import type { GameGuildMember } from "@/types/guild-member";

export type Guild = {
  id: string;
  name: string;
  icon: string | null;
  vanityUrl?: string;
};

export type GuildMember = GameGuildMember;
