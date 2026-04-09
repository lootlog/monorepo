import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useGuildMember } from "@/hooks/api/members/use-guild-member";
import { useMemberRefresh } from "@/hooks/api/members/use-member-refresh";
import { useGuilds } from "@/hooks/api/guilds/use-guilds";
import { useTheme } from "@/hooks/context/use-theme";
import { cn } from "@lootlog/ui/lib/utils";
import { getPermissionRefreshInfo } from "@/utils/get-permission-refresh-info";
import { RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

export const GuildSidebarHeader = ({ guildId }: { guildId?: string }) => {
  const { data: guilds } = useGuilds();
  const { data: member } = useGuildMember();
  const { mutate: refreshMember } = useMemberRefresh();
  const { theme } = useTheme();
  const isRukiaTheme = theme === "rukia";
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

  const guild = guilds?.find(
    (currentGuild) =>
      currentGuild.id === guildId || currentGuild.vanityUrl === guildId,
  );

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
      <span
        className={cn(
          "ml-3 max-w-44 overflow-hidden text-ellipsis text-nowrap",
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
      </span>
      <span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshPermissions}
                disabled={!canTriggerRefresh}
              >
                <RefreshCcw />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="z-50 mt-4">
            {canTriggerRefreshText}
          </TooltipContent>
        </Tooltip>
      </span>
    </>
  );
};
