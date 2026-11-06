import { TooltipContent } from "@lootlog/ui/components/tooltip";
import { useTranslation } from "react-i18next";

/** Names a server-rail avatar, with its locked and hidden states. */
export const GuildNavItemTooltip = ({
  name,
  isLocked,
  isHidden,
}: {
  name: string;
  isLocked: boolean;
  isHidden: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <TooltipContent side="right" className="font-medium">
      <div>{name}</div>
      {isLocked ? (
        <div className="text-xs font-normal text-muted-foreground">
          {t("layout.guildsSelector.noAccess")}
        </div>
      ) : null}
      {isHidden ? (
        <div className="text-xs font-normal text-muted-foreground">
          {t("settings.servers.hiddenInGameClient")}
        </div>
      ) : null}
    </TooltipContent>
  );
};
