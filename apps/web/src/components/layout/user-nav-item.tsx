import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useSession } from "@/hooks/auth/use-session";
import { ROUTES } from "@/config/routes";
import { cn } from "@/utils/cn";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Link, useLocation } from "@tanstack/react-router";
import { ThemeCircularFrame, useThemeMeta } from "@/themes";
import type { MouseEvent } from "react";

export const UserNavItem = () => {
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
        "size-11 transition-all duration-200 rounded-lg hover:rounded-lg hover:scale-105",
        isActive && !isRukiaTheme && "border-[3px] border-primary",
      )}
    >
      <AvatarImage src={data?.user.image ?? ""} alt={data?.user.image ?? ""} />
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
            {isActive && !isRukiaTheme && (
              <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_6px_var(--primary)/0.4]" />
            )}
            <Link
              to={ROUTES.user.dashboard}
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
