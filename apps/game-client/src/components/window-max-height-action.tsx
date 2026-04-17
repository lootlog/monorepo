import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type WindowMaxHeightActionProps = {
  currentMaxHeight: number;
  isArmed: boolean;
  onClick: () => void;
};

export const WindowMaxHeightAction: FC<WindowMaxHeightActionProps> = ({
  currentMaxHeight,
  isArmed,
  onClick,
}) => {
  const { t } = useTranslation();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          aria-label={t("settings.common.windowAutoHeight.maxHeightAria", {
            height: currentMaxHeight,
          })}
          className={cn(
            "ll:h-4 ll:min-w-10 ll:px-1.5 ll:text-[10px] ll:leading-none",
            isArmed
              ? "ll:border-blue-400/70 ll:bg-blue-400/15 ll:text-blue-200"
              : "ll:border-gray-500/40 ll:bg-transparent ll:text-gray-300 ll:hover:border-gray-400/50 ll:hover:text-gray-200",
          )}
          onClick={onClick}
        >
          {t("settings.common.windowAutoHeight.maxHeightLabel", {
            height: currentMaxHeight,
          })}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {isArmed
          ? t("settings.common.windowAutoHeight.armedTooltip")
          : t("settings.common.windowAutoHeight.idleTooltip")}
      </TooltipContent>
    </Tooltip>
  );
};
