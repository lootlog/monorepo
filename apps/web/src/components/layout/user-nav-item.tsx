import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useSession } from "@/hooks/auth/use-session";
import { ROUTES } from "@/config/routes";
import { cn } from "@lootlog/ui/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { motion } from "framer-motion";
import { Link, useLocation } from "@tanstack/react-router";
import { ThemeCircularFrame, useThemeMeta } from "@/themes";

export const UserNavItem = () => {
  const { data } = useSession();
  const { pathname } = useLocation();
  const { isRukiaTheme } = useThemeMeta();

  const isActive = pathname.startsWith("/@me");
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
      <TooltipTrigger asChild>
        <div className="relative h-10 flex items-center justify-center">
          {isActive && !isRukiaTheme && (
            <motion.div
              layoutId="guild-active-pill"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)/0.4]"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          <Link to={ROUTES.user.dashboard} className="block">
            <ThemeCircularFrame isActive={isActive}>
              {avatarElement}
            </ThemeCircularFrame>
          </Link>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">{data?.user.name}</TooltipContent>
    </Tooltip>
  );
};
