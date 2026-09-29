import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Button } from "@lootlog/ui/components/button";
import { PlusCircleIcon } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useGlobalContext } from "@/hooks/context/use-global-context";

export const GuildNavCreate: FC = () => {
  const { t } = useTranslation();

  const {
    createGuildModal: { dispatch },
  } = useGlobalContext();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={t("ui.tooltips.createLootlog")}
            className="h-auto w-14 flex-col gap-1 px-1 py-1.5 text-xs leading-none has-[>svg]:px-1"
            variant="ghost"
            onClick={() => dispatch({ type: "OPEN" })}
          >
            <PlusCircleIcon aria-hidden="true" className="!size-6" />
            {t("ui.sidebar.createLootlog")}
          </Button>
        }
      />
      <TooltipContent side="right">
        {t("ui.tooltips.createLootlog")}
      </TooltipContent>
    </Tooltip>
  );
};
