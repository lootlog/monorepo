import { Kbd } from "@lootlog/ui/components/kbd";
import { cn } from "cn";
import { upperFirst } from "es-toolkit";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

type GuildSearchFooterProps = {
  world: string;
};

/** Keyboard hints, and the world that player and loot hits come from. */
export const GuildSearchFooter = ({ world }: GuildSearchFooterProps) => {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex h-10 items-center gap-4 border-t border-border px-3.5 text-xs text-muted-foreground",
        !world && "max-md:hidden",
      )}
    >
      <span className="flex items-center gap-1.5 max-md:hidden">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        {t("loots.searchCommand.footerNavigate")}
      </span>
      <span className="flex items-center gap-1.5 max-md:hidden">
        <Kbd>↵</Kbd>
        {t("loots.searchCommand.footerOpen")}
      </span>
      {world && (
        <span className="flex min-w-0 items-center gap-1.5 text-foreground/80 md:ml-auto">
          <Globe
            aria-hidden="true"
            className="size-3.5 shrink-0 text-primary"
          />
          <span className="truncate">
            {t("loots.searchCommand.worldContext", {
              world: upperFirst(world),
            })}
          </span>
        </span>
      )}
    </div>
  );
};
