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

export const UserNavItem = () => {
  const { data } = useSession();
  const { pathname } = useLocation();

  const isActive = pathname.startsWith("/@me");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative h-10 flex items-center justify-center">
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)/0.4]" />
          )}
          <Link to={ROUTES.user.dashboard} className="block">
            <Avatar
              className={cn(
                "size-11 transition-all duration-200 rounded-lg hover:scale-105",
                isActive &&
                  "ring-2 ring-primary/80 shadow-[0_0_12px_var(--primary)/0.3]",
              )}
            >
              <AvatarImage
                src={data?.user.image ?? ""}
                alt={data?.user.image ?? ""}
              />
              <AvatarFallback className="rounded-none">
                {data?.user?.name[0] || ""}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">{data?.user.name}</TooltipContent>
    </Tooltip>
  );
};
