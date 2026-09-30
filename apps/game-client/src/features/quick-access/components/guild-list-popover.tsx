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
import { useSetupChecklist } from "@/features/setup-checklist/use-setup-checklist";
import { openLootlogApp } from "@/lib/open-lootlog-app";
import {
  ExternalLink,
  ListChecks,
  Loader2,
  SquareArrowOutUpRight,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const GuildListPopover = () => {
  const { t } = useTranslation("quickAccess");
  const { t: tCommon } = useTranslation("common");
  const [open, setOpen] = useState(false);

  const {
    guildsQuery: { isLoading },
    orderedGuilds: guilds,
  } = useLootlogGuilds();

  // A hidden checklist comes back here while there is still something to do.
  const setup = useSetupChecklist();
  const canShowSetup = setup.dismissed && setup.incomplete;

  const handleGuildClick = (guildId: string) => {
    openLootlogApp(`/${guildId}`);
    setOpen(false);
  };

  const handleDashboardClick = () => {
    openLootlogApp();
    setOpen(false);
  };

  const handleShowSetupClick = () => {
    setup.setDismissed(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <QuickAccessButton
          label={t("guildPopover.lootlogPage")}
          icon=<SquareArrowOutUpRight
            aria-hidden="true"
            className="ll:size-4"
          />
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

            {canShowSetup ? (
              <Button
                size="xs"
                variant="menu"
                className="ll:w-full ll:justify-between ll:h-auto"
                onClick={handleShowSetupClick}
              >
                <span>{t("guildPopover.showSetup")}</span>
                <ListChecks
                  aria-hidden
                  className="ll:w-3 ll:h-3 ll:text-muted-foreground"
                />
              </Button>
            ) : null}

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
              <div className="ll:flex ll:flex-col ll:gap-0.5 ll:border-0 ll:border-t ll:border-gray-400/40 ll:px-2 ll:py-2 ll:text-xs">
                <span className="ll:font-semibold ll:text-foreground/85">
                  {tCommon("noLootlog.title")}
                </span>
                <span className="ll:text-[11px] ll:leading-4 ll:text-muted-foreground ll:text-pretty">
                  {tCommon("noLootlog.description")}
                </span>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
