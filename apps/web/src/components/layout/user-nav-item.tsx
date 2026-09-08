import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useSession } from "@/hooks/auth/use-session";
import { ROUTES } from "@/config/routes";
import { cn } from "cn";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Link, useLocation } from "@tanstack/react-router";
import { ThemeCircularFrame, useThemeMeta } from "@/themes";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";

export const UserNavItem = () => {
  const { t } = useTranslation();
  const { data } = useSession();
  const { pathname } = useLocation();
  const { isRukiaTheme } = useThemeMeta();

  const isActive = pathname.startsWith("/@me");
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.detail > 0) {
      event.currentTarget.blur();
    }
  };
  const avatarElement = (
    <Avatar
      className={cn(
        "size-11 rounded-xl after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] after:ring-2 after:ring-inset after:ring-primary after:opacity-0 after:transition-opacity after:duration-200 motion-reduce:after:transition-none",
        isActive && !isRukiaTheme && "after:opacity-100",
      )}
    >
      <AvatarImage src={data?.user.image ?? ""} alt="" />
      <AvatarFallback className="rounded-none">
        {data?.user?.name[0] || ""}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="relative h-10 flex items-center justify-center">
            <Link
              to={ROUTES.user.dashboard}
              aria-label={t("common.routeErrors.actions.goToDashboard")}
              className="block"
              onClick={handleClick}
            >
              <ThemeCircularFrame isActive={isActive}>
                {avatarElement}
              </ThemeCircularFrame>
            </Link>
          </div>
        }
      />
      <TooltipContent side="right">{data?.user.name}</TooltipContent>
    </Tooltip>
  );
};
