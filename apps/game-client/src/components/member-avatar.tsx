import type { FC } from "react";
import { cn } from "cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type MemberAvatarProps = {
  name: string;
  avatarUrl: string | null;
  className?: string;
};

/** A Discord member's 16px round avatar, with their initial while it loads. */
export const MemberAvatar: FC<MemberAvatarProps> = ({
  name,
  avatarUrl,
  className,
}) => (
  <Avatar
    aria-hidden
    className={cn(
      "ll:flex ll:size-4 ll:shrink-0 ll:overflow-hidden ll:rounded-full ll:bg-black/40",
      className,
    )}
  >
    {avatarUrl ? (
      <AvatarImage
        src={avatarUrl}
        alt=""
        className="ll:size-full ll:object-cover"
      />
    ) : null}
    <AvatarFallback className="ll:flex ll:size-full ll:items-center ll:justify-center ll:text-[9px] ll:font-semibold ll:text-foreground">
      {name.charAt(0).toUpperCase()}
    </AvatarFallback>
  </Avatar>
);
