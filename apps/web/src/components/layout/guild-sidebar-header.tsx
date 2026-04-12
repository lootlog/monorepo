import { Button } from "@lootlog/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useGuildMember } from "@/hooks/api/members/use-guild-member";
import { useMemberRefresh } from "@/hooks/api/members/use-member-refresh";
import { useGuild } from "@/hooks/api/guilds/use-guild";
import { cn } from "@lootlog/ui/lib/utils";
import { getPermissionRefreshInfo } from "@/utils/get-permission-refresh-info";
import { RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMeta } from "@/themes";

export const GuildSidebarHeader = ({ guildId }: { guildId?: string }) => {
  const { data: guild } = useGuild({ retry: false });
  const { data: member } = useGuildMember();
  const { mutate: refreshMember } = useMemberRefresh();
  const { isRukiaTheme } = useThemeMeta();
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const { canTriggerRefresh, canTriggerRefreshText } = getPermissionRefreshInfo(
    member?.updatedAt,
    currentTimestamp,
  );

  const handleRefreshPermissions = () => {
    if (!guildId) {
      return;
    }

    refreshMember({ memberId: "@me" });
  };

  return (
    <>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={guild?.id ?? "loading"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            <Avatar className="size-8 rounded-lg shrink-0">
              <AvatarImage
                src={guild?.icon as string}
                alt={guild?.name}
                className="pointer-events-none select-none"
              />
              <AvatarFallback className="rounded-lg text-xs font-semibold">
                {guild?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.span
            key={guild?.id ?? "loading"}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.15, delay: 0.03 }}
            className={cn(
              "max-w-36 overflow-hidden text-ellipsis text-nowrap text-sm",
              isRukiaTheme && "font-semibold",
            )}
            style={
              isRukiaTheme
                ? {
                    background:
                      "linear-gradient(135deg, #e0f4ff 0%, #a8d8ff 30%, #7cc4ff 50%, #b8e0ff 70%, #ffffff 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter:
                      "drop-shadow(0 0 4px rgba(180, 220, 255, 0.6)) drop-shadow(0 0 8px rgba(150, 200, 255, 0.3))",
                  }
                : undefined
            }
          >
            {guild?.name}
          </motion.span>
        </AnimatePresence>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={handleRefreshPermissions}
              disabled={!canTriggerRefresh}
            >
              <RefreshCcw className="size-3.5" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent className="z-50 mt-4">
          {canTriggerRefreshText}
        </TooltipContent>
      </Tooltip>
    </>
  );
};
