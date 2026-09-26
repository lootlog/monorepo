import type { FC } from "react";
import { cn } from "cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { GuildIdentity } from "@/lib/api/generated-helpers";

/** A Lootlog's 16px icon beside its name, with its initial while the image loads. */
export const GuildAvatar: FC<{ guild: GuildIdentity; className?: string }> = ({
  guild,
  className,
}) => (
  <Avatar
    aria-hidden
    className={cn(
      "ll:flex ll:size-4 ll:shrink-0 ll:overflow-hidden ll:rounded-sm ll:bg-black/40",
      className,
    )}
  >
    <AvatarImage
      src={guild.icon ?? undefined}
      alt=""
      className="ll:size-full ll:object-cover"
    />
    <AvatarFallback className="ll:flex ll:size-full ll:items-center ll:justify-center ll:text-[9px] ll:font-semibold ll:text-foreground">
      {guild.name.charAt(0).toUpperCase()}
    </AvatarFallback>
  </Avatar>
);
