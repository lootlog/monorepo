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
        <Link
          to={ROUTES.user.dashboard}
          className="h-10 flex items-center justify-center"
        >
          <Avatar
            className={cn(
              "size-12 border-solid border-4 transition-all border-transparent  rounded-lg",
              { "border-primary": isActive },
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
      </TooltipTrigger>
      <TooltipContent side="right">{data?.user.name}</TooltipContent>
    </Tooltip>
  );
};
