import type { FC } from "react";
import { cn } from "cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { GuildIdentity } from "@/lib/api/generated-helpers";

const GUILD_AVATAR_SIZE_CLASS_NAMES = {
  xs: "ll:size-4 ll:text-[9px]",
  sm: "ll:size-5 ll:text-[10px]",
  md: "ll:size-6 ll:text-[11px]",
  lg: "ll:size-8",
} as const;

type GuildAvatarProps = {
  guild: GuildIdentity;
  size?: keyof typeof GUILD_AVATAR_SIZE_CLASS_NAMES;
  className?: string;
};

export const GuildAvatar: FC<GuildAvatarProps> = ({
  guild,
  size = "xs",
  className,
}) => (
  <Avatar
    aria-hidden
    className={cn(GUILD_AVATAR_SIZE_CLASS_NAMES[size], className)}
  >
    <AvatarImage src={guild.icon ?? undefined} alt="" />
    <AvatarFallback>{guild.name.charAt(0).toUpperCase()}</AvatarFallback>
  </Avatar>
);
