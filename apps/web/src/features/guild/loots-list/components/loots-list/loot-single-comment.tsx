import type { LootComment } from "@/lib/loots/loot-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { MemberIdentity } from "@/components/common/member-identity";
import { getDiscordAvatarUrl } from "@lootlog/domain/discord-avatar";
import type { FC } from "react";

export type LootSingleCommentProps = {
  comment: LootComment;
};

export const LootSingleComment: FC<LootSingleCommentProps> = ({ comment }) => {
  const relativeTime = getRelativeTime(comment.createdAt);
  const member = { memberId: comment.member.id };

  return (
    <li className="flex flex-row gap-3 border-b border-border/50 bg-card/10 px-3 py-2.5 text-sm transition-colors hover:bg-card/30 sm:px-4">
      <MemberIdentity
        member={member}
        fallback={{
          name: comment.member.name,
          avatarUrl: getDiscordAvatarUrl(
            comment.member.userId,
            comment.member.avatar,
            64,
          ),
        }}
        display="avatar"
        interactive={false}
        className="self-start"
        avatarClassName="size-7"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <MemberIdentity
            member={member}
            fallback={{ name: comment.member.name }}
            display="name"
            nameClassName="font-semibold"
          />
          <div className="text-xs text-muted-foreground">{relativeTime}</div>
        </div>
        <div className="mt-0.5 break-words text-foreground">
          {comment.content}
        </div>
      </div>
    </li>
  );
};
