import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { getMemberAccessSummary } from "./member-access-summary";
import type { MemberAccessState } from "./member-list-item.utils";

type MemberAccessBadgesProps = {
  accessState: MemberAccessState;
  isOnlineOnWeb: boolean;
  isOnlineInGame: boolean;
};

/** Whether a member has access, and where they are online right now. */
export const MemberAccessBadges = ({
  accessState,
  isOnlineOnWeb,
  isOnlineInGame,
}: MemberAccessBadgesProps) => {
  const { t } = useTranslation();
  const summary = getMemberAccessSummary(accessState, t);
  const Icon = summary.icon;
  const isOnline = isOnlineOnWeb || isOnlineInGame;
  let onlineStatusLabel = t("settings.members.webActivity.offline");

  if (isOnlineOnWeb && isOnlineInGame) {
    onlineStatusLabel = t(
      "settings.members.webActivity.onlineSources.webAndGame",
    );
  } else if (isOnlineOnWeb) {
    onlineStatusLabel = t("settings.members.webActivity.onlineSources.web");
  } else if (isOnlineInGame) {
    onlineStatusLabel = t("settings.members.webActivity.onlineSources.game");
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge
        variant={summary.variant}
        className={cn("gap-1.5", summary.className)}
      >
        <Icon className="size-3.5" />
        {summary.label}
      </Badge>
      <Badge
        variant={isOnline ? "live" : "outline"}
        className={cn(!isOnline && "bg-background text-muted-foreground")}
      >
        {onlineStatusLabel}
      </Badge>
    </span>
  );
};
