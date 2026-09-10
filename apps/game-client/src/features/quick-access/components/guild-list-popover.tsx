import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LOOTLOG_APP_URL } from "@/config/app";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@lootlog/client/main";
import { ExternalLink, Loader2, SquareArrowOutUpRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const GuildListPopover = () => {
  const { t } = useTranslation("quickAccess");
  const [open, setOpen] = useState(false);
  const { data: guilds, isLoading } =
    useUsersControllerGetCurrentUserAccessibleGuilds({
      query: {
        queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
        refetchOnMount: false,
        staleTime: 1000 * 60 * 5,
      },
    });

  const handleGuildClick = (guildId: string) => {
    window.open(`${LOOTLOG_APP_URL}/${guildId}`, "_blank");
    setOpen(false);
  };

  const handleDashboardClick = () => {
    window.open(`${LOOTLOG_APP_URL}/@me`, "_blank");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button className="ll:quick-access-button ll-custom-cursor-pointer ll:h-6">
              <SquareArrowOutUpRight size="16" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <span>{t("guildPopover.lootlogPage")}</span>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        className="ll-action-menu ll:w-48 ll:p-0 ll:overflow-hidden"
        align="start"
      >
        {isLoading ? (
          <div className="ll:flex ll:items-center ll:justify-center ll:py-3">
            <Loader2 className="ll:h-4 ll:w-4 ll:animate-spin ll:text-muted-foreground" />
          </div>
        ) : (
          <div className="ll:space-y-0">
            <Button
              variant="menu"
              className="ll:w-full ll:justify-between ll:h-auto"
              onClick={handleDashboardClick}
            >
              <span>{t("guildPopover.dashboard")}</span>
              <ExternalLink className="ll:w-3 ll:h-3 ll:text-muted-foreground" />
            </Button>

            {guilds && guilds.length > 0 && (
              <div className="ll:border-0 ll:border-t ll:border-solid ll:border-gray-400/40" />
            )}

            {guilds && guilds.length > 0 ? (
              <ScrollArea
                className={`ll:max-h-[240px] ${guilds.length <= 6 ? "ll:h-auto" : ""}`}
              >
                <div className="ll:space-y-0">
                  {guilds.map((guild) => (
                    <Button
                      variant="menu"
                      key={guild.id}
                      className="ll:w-full ll:justify-between ll:h-auto"
                      onClick={() => handleGuildClick(guild.id)}
                    >
                      <div className="ll:flex ll:items-center ll:gap-2 ll:overflow-hidden ll:flex-1 ll:min-w-0">
                        <Avatar className="ll:size-6 ll:flex ll:items-center ll:justify-center ll:shrink-0 ll:p-0">
                          <AvatarImage
                            src={guild.icon ?? undefined}
                            alt={guild.name}
                            className="ll:object-cover ll:size-full ll:rounded-full"
                          />
                          <AvatarFallback className="ll:text-xs ll:font-semibold ll:bg-muted ll:text-popover-foreground ll:size-full ll:flex ll:items-center ll:justify-center ll:rounded-full">
                            {guild.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="ll:truncate">{guild.name}</span>
                      </div>
                      <ExternalLink className="ll:w-3 ll:h-3 ll:text-muted-foreground ll:shrink-0" />
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="ll:px-2 ll:py-2 ll:text-center ll:text-xs ll:text-muted-foreground">
                {t("guildPopover.emptyGuilds")}
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
