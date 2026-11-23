import { EyeOff, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UnreadLootsBadge } from "./unread-loots-badge";

const markClassName =
  "pointer-events-none absolute right-0.5 z-20 size-4 rounded-full border border-sidebar-border bg-sidebar p-0.5 text-muted-foreground";

export const GuildNavItemMarks = ({
  isHidden,
  isLocked,
  unreadLootsCount,
}: {
  isHidden: boolean;
  isLocked: boolean;
  unreadLootsCount: number;
}) => {
  const { t } = useTranslation();

  return (
    <>
      {isHidden ? (
        <EyeOff aria-hidden className={`${markClassName} top-0.5`} />
      ) : null}
      {isLocked ? (
        <>
          <Lock aria-hidden className={`${markClassName} bottom-0.5`} />
          <span className="sr-only">{t("layout.guildsSelector.noAccess")}</span>
        </>
      ) : unreadLootsCount > 0 ? (
        <UnreadLootsBadge count={unreadLootsCount} />
      ) : null}
    </>
  );
};
