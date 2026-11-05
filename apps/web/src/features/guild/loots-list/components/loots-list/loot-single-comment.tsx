import type { LootComment } from "@/lib/loots/loot-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { MemberAvatar } from "@/components/common/member-avatar";
import { getColorFromRole } from "@/utils/get-color-from-role";
import type { FC } from "react";

export type LootSingleCommentProps = {
  comment: LootComment;
};

export const LootSingleComment: FC<LootSingleCommentProps> = ({ comment }) => {
  const relativeTime = getRelativeTime(comment.createdAt);
  const color = getColorFromRole(comment.member.roles);

  return (
    <li className="flex flex-row gap-3 border-b border-border/50 bg-card/10 px-3 py-2.5 text-sm transition-colors hover:bg-card/30 sm:px-4">
      <MemberAvatar
        userId={comment.member.userId}
        avatar={comment.member.avatar}
        name={comment.member.name}
        className="size-7"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold" style={{ color: `#${color}` }}>
            {comment.member.name}
          </span>
          <div className="text-xs text-muted-foreground">{relativeTime}</div>
        </div>
        <div className="mt-0.5 break-words text-foreground">
          {comment.content}
        </div>
      </div>
    </li>
  );
};
