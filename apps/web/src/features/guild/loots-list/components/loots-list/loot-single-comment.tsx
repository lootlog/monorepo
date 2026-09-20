import type { LootComment } from "@/lib/loots/loot-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { getColorFromRole } from "@/utils/get-color-from-role";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type LootSingleCommentProps = {
  comment: LootComment;
};

export const LootSingleComment: FC<LootSingleCommentProps> = ({ comment }) => {
  const { t } = useTranslation();

  const avatarUrl = getDiscordAvatarUrl(
    comment.member.userId,
    comment.member.avatar,
  );

  const relativeTime = getRelativeTime(comment.createdAt);
  const color = getColorFromRole(comment.member.roles);

  return (
    <li className="flex flex-row gap-3 border-b border-border/50 bg-card/10 px-3 py-2.5 text-sm transition-colors hover:bg-card/30 sm:px-4">
      <Avatar className="size-7 ring-2 ring-border/30">
        <AvatarImage src={avatarUrl} alt={t("common.avatarAlt")} />
        <AvatarFallback>{comment.member.name.slice(0, 1)}</AvatarFallback>
      </Avatar>
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
