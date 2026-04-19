import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

export const CommandActions = () => {
  const { t } = useTranslation();

  return [
    <Tooltip key="command-info-tooltip">
      <TooltipTrigger asChild>
        <Info
          className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
          size="14"
        />
      </TooltipTrigger>
      <TooltipContent side="top">
        <div className="ll:flex ll:max-w-56 ll:flex-col ll:gap-1">
          <span className="ll:text-xs ll:font-semibold ll:text-white">
            {t("settings.command.tooltip.title")}
          </span>
          <span className="ll:text-[11px] ll:leading-4 ll:text-gray-300">
            {t("settings.command.tooltip.commands")}
          </span>
          <span className="ll:text-[11px] ll:leading-4 ll:text-gray-400">
            {t("settings.command.tooltip.keyboard")}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>,
  ];
};
