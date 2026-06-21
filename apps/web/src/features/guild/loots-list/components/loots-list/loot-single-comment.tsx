import type { LootComment } from "@/lib/loots/loot-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { getColorFromRole } from "@/utils/get-color-from-role";
import { Avatar, AvatarImage } from "@lootlog/ui/components/avatar";
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
    <li className="text-sm border-b border-border/50 px-4 py-3 flex flex-row gap-3 bg-card/10 hover:bg-card/30 transition-colors">
      <Avatar className="size-7 ring-2 ring-border/30">
        <AvatarImage src={avatarUrl} alt={t("common.avatarAlt")} />
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className="font-semibold" style={{ color: `#${color}` }}>
            {comment.member.name}
          </span>
          <div className="text-xs text-muted-foreground">{relativeTime}</div>
        </div>
        <div className="text-foreground mt-0.5">{comment.content}</div>
      </div>
    </li>
  );
};
