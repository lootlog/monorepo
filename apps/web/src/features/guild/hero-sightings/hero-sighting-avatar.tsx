import type { HeroSightingMemberDto } from "@lootlog/client/main";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { cn } from "cn";

type HeroSightingAvatarProps = {
  member: HeroSightingMemberDto;
  className?: string;
};

/** A member's Discord avatar, with their initial while it loads or without one. */
export const HeroSightingAvatar = ({
  member,
  className,
}: HeroSightingAvatarProps) => (
  <Avatar className={cn("size-6 shrink-0", className)}>
    {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />}
    <AvatarFallback className="text-[10px]">
      {member.displayName[0]}
    </AvatarFallback>
  </Avatar>
);
