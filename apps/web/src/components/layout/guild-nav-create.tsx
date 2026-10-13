import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Plus } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useGlobalContext } from "@/hooks/context/use-global-context";

// Ends the guild list like Discord's "Add a Server", sized as a guild avatar.
export const GuildNavCreate: FC = () => {
  const { t } = useTranslation();

  const {
    createGuildModal: { dispatch },
  } = useGlobalContext();

  return (
    <div className="mb-2 flex w-full items-center justify-center">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={t("ui.tooltips.createLootlog")}
              className="flex size-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-sidebar-foreground/30 text-sidebar-foreground/60 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              onClick={() => dispatch({ type: "OPEN" })}
            >
              <Plus aria-hidden="true" className="size-5" />
            </button>
          }
        />
        <TooltipContent side="right">
          {t("ui.tooltips.createLootlog")}
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
