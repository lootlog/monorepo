import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useSession } from "@/hooks/auth/use-session";
import { ROUTES } from "@/config/routes";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Link, useLocation } from "@tanstack/react-router";
import { ThemeCircularFrame } from "@/themes";
import { RailItemIndicator } from "./rail-item-indicator";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";

const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
  if (event.detail > 0) {
    event.currentTarget.blur();
  }
};

export const UserNavItem = () => {
  const { t } = useTranslation();
  const { data } = useSession();
  const { pathname } = useLocation();

  const isActive = pathname.startsWith("/@me");

  const avatarElement = (
    <Avatar className="size-11 rounded-xl">
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
          <div className="group/rail-item relative h-10 flex items-center justify-center">
            <RailItemIndicator isActive={isActive} />
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
