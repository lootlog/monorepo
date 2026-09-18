import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { cn } from "cn";

type StatsMemberAvatarProps = {
  userId: string;
  avatar: string | null;
  name: string;
  className?: string;
  /** Requested image size in pixels; pick roughly twice the rendered size. */
  imageSize?: number;
};

export const StatsMemberAvatar = ({
  userId,
  avatar,
  name,
  className,
  imageSize = 64,
}: StatsMemberAvatarProps) => (
  <Avatar className={cn("size-8 shrink-0", className)}>
    <AvatarImage src={getDiscordAvatarUrl(userId, avatar, imageSize)} alt="" />
    <AvatarFallback className="text-xs">{name[0]}</AvatarFallback>
  </Avatar>
);
