import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { getDiscordAvatarUrl } from "@lootlog/domain/discord-avatar";
import { cn } from "cn";

type MemberAvatarSource =
  | {
      userId: string;
      avatar?: string | null;
      avatarUrl?: never;
    }
  | {
      avatarUrl: string | null;
      userId?: never;
      avatar?: never;
    };

type MemberAvatarProps = MemberAvatarSource & {
  name: string;
  className?: string;
  imageSize?: number;
};

export const MemberAvatar = ({
  name,
  className,
  imageSize = 64,
  ...source
}: MemberAvatarProps) => {
  const src =
    source.avatarUrl === undefined
      ? getDiscordAvatarUrl(source.userId, source.avatar, imageSize)
      : source.avatarUrl;

  return (
    <Avatar aria-hidden className={cn("size-8 shrink-0", className)}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="text-xs">
        {name.charAt(0).toUpperCase() || "?"}
      </AvatarFallback>
    </Avatar>
  );
};
