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
      <TooltipTrigger
        render={
          <Button
            aria-label={t("ui.tooltips.installAddon")}
            variant="ghost"
            className="h-auto w-14 flex-col gap-1 px-1 py-1.5 text-xs leading-none has-[>svg]:px-1"
            onClick={() => dispatch({ type: "OPEN" })}
          >
            <Blocks aria-hidden="true" color="#3E8667" className="!size-6" />
            {t("ui.sidebar.installAddon")}
          </Button>
        }
      />
      <TooltipContent side="right">
        {t("ui.tooltips.installAddon")}
      </TooltipContent>
    </Tooltip>
  );
};
