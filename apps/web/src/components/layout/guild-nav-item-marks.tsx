import { Badge } from "@lootlog/ui/components/badge";
import { EyeOff, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

const markClassName =
  "pointer-events-none absolute right-0.5 z-20 size-4 rounded-full border border-sidebar-border bg-sidebar p-0.5 text-muted-foreground";

/** Corner marks on a server-rail avatar: hidden, locked, and unread loots. */
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
        <Badge
          variant="destructive"
          className="pointer-events-none absolute bottom-0.5 right-0.5 z-20 h-4.5 min-w-4.5 justify-center px-1 text-[9px] leading-none ring-2 ring-sidebar"
        >
          {unreadLootsCount > 99
            ? t("layout.guildsSelector.unreadLootsOverflow")
            : unreadLootsCount}
        </Badge>
      ) : null}
    </>
  );
};
