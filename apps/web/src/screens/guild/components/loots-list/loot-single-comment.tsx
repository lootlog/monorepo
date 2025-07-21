import { LootComment } from "@/hooks/api/use-loot-comments";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { Avatar, AvatarImage } from "@lootlog/ui/components/avatar";
import { FC } from "react";

export type LootSingleCommentProps = {
  comment: LootComment;
};

export const LootSingleComment: FC<LootSingleCommentProps> = ({ comment }) => {
  const avatarUrl = getDiscordAvatarUrl(
    comment.member.userId,
    comment.member.avatar
  );
  const relativeTime = getRelativeTime(comment.createdAt);
  const color =
    comment.member.roles?.[0]?.color === 0
      ? "FFF"
      : comment.member.roles?.[0]?.color.toString(16);

  return (
    <li className="text-sm border-b px-4 py-2 flex flex-row gap-2">
      <Avatar className="size-6">
        <AvatarImage src={avatarUrl} alt="Avatar" />
      </Avatar>
      <div>
        <div className="flex items-center space-x-2">
          <span className="font-semibold" style={{ color: `#${color}` }}>
            {comment.member.name}
          </span>
          <div className="text-xs text-muted-foreground">{relativeTime}</div>
        </div>
        <div>{comment.content}</div>
      </div>
    </li>
  );
};
