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
      <TooltipTrigger asChild>
        <Button
          className="size-11 0"
          variant="secondary"
          onClick={() => dispatch({ type: "OPEN" })}
        >
          <PlusCircleIcon />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {t("ui.tooltips.createLootlog")}
      </TooltipContent>
    </Tooltip>
  );
};
