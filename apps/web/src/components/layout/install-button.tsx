import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Button } from "@lootlog/ui/components/button";
import { Blocks } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useGlobalContext } from "@/hooks/context/use-global-context";

export const InstallButton: FC = () => {
  const { t } = useTranslation();
  const {
    installAddonModal: { dispatch },
  } = useGlobalContext();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          className="size-11"
          onClick={() => dispatch({ type: "OPEN" })}
        >
          <Blocks color="#3E8667" className="!size-6" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {t("ui.tooltips.installAddon")}
      </TooltipContent>
    </Tooltip>
  );
};
