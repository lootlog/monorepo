import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { cn } from "cn";

const DISCORD_CDN = "https://cdn.discordapp.com/";

export function UserAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image: string | null;
  className?: string;
}) {
  return (
    <Avatar aria-hidden="true" className={cn("size-8", className)}>
      {image?.startsWith(DISCORD_CDN) ? (
        <AvatarImage src={image} alt="" loading="lazy" />
      ) : null}
      <AvatarFallback className="bg-secondary text-sm font-semibold uppercase text-secondary-foreground">
        {name.trim().charAt(0) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
