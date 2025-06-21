import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "@/hooks/auth/use-session";
import { cn } from "@/utils/cn";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Link, useLocation } from "react-router-dom";

export const UserNavItem = () => {
  const { data } = useSession();
  const { pathname } = useLocation();

  const isActive = pathname === "/@me";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to="/@me" className="h-10 flex items-center justify-center">
          <Avatar
            className={cn(
              "size-12 border-solid border-4 transition-all border-transparent  rounded-lg",
              { "border-primary": isActive }
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
