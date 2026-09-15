import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuickAccessButton } from "@/features/quick-access/components/quick-access-button";
import { LOOTLOG_APP_URL } from "@/config/app";
import { ExternalLink, Loader2, SquareArrowOutUpRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const GuildListPopover = () => {
  const { t } = useTranslation("quickAccess");
  const [open, setOpen] = useState(false);

  const {
    guildsQuery: { isLoading },
    orderedGuilds: guilds,
  } = useLootlogGuilds();

  const handleGuildClick = (guildId: string) => {
    window.open(`${LOOTLOG_APP_URL}/${guildId}`, "_blank", "noopener");
    setOpen(false);
  };

  const handleDashboardClick = () => {
    window.open(`${LOOTLOG_APP_URL}/@me`, "_blank", "noopener");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <QuickAccessButton
          label={t("guildPopover.lootlogPage")}
          icon=<SquareArrowOutUpRight size={16} aria-hidden="true" />
          active={open}
        />
      </PopoverTrigger>

      <PopoverContent
        className="ll-action-menu ll:w-48 ll:p-0 ll:overflow-hidden"
        align="start"
        side="bottom"
      >
        {isLoading ? (
          <div className="ll:flex ll:items-center ll:justify-center ll:py-3">
            <Loader2 className="ll:h-4 ll:w-4 ll:animate-spin ll:text-muted-foreground" />
          </div>
        ) : (
          <div className="ll:space-y-0">
            <Button
              size="xs"
              variant="menu"
              className="ll:w-full ll:justify-between ll:h-auto"
              onClick={handleDashboardClick}
            >
              <span>{t("guildPopover.dashboard")}</span>
              <ExternalLink className="ll:w-3 ll:h-3 ll:text-muted-foreground" />
            </Button>

            {guilds.length > 0 && (
              <div className="ll:border-0 ll:border-t ll:border-gray-400/40" />
            )}

            {guilds.length > 0 ? (
              <ScrollArea
                className={`ll:max-h-[240px] ${guilds.length <= 6 ? "ll:h-auto" : ""}`}
              >
                <div className="ll:space-y-0">
                  {guilds.map((guild) => (
                    <Button
                      size="xs"
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
