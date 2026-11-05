import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { cn } from "cn";

type MemberAvatarSource =
  | {
      /** Discord user id, which picks the default avatar when none is set. */
      userId: string;
      /** Discord avatar hash; without one Discord's default avatar shows. */
      avatar?: string | null;
      avatarUrl?: never;
    }
  | {
      /** An avatar URL the API resolved; without one the initial shows. */
      avatarUrl: string | null;
      userId?: never;
      avatar?: never;
    };

type MemberAvatarProps = MemberAvatarSource & {
  name: string;
  className?: string;
  /** Requested image size in pixels; pick roughly twice the rendered size. */
  imageSize?: number;
};

/** A member's Discord avatar, with their initial while it loads. */
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
    // Decorative: the member's name always sits beside it, so the initial must
    // not join the name a link or button announces.
    <Avatar aria-hidden className={cn("size-8 shrink-0", className)}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="text-xs">
        {name.charAt(0).toUpperCase() || "?"}
      </AvatarFallback>
    </Avatar>
  );
};
