import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import { BadgeCheck } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type VerifiedMargonemAccountIconProps = {
  className?: string;
};

export const VerifiedMargonemAccountIcon: FC<
  VerifiedMargonemAccountIconProps
> = ({ className }) => {
  const { t } = useTranslation("onlinePlayers");
  const label = t("player.verifiedMargonemAccount");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "ll:inline-flex ll:size-4 ll:items-center ll:justify-center ll:rounded-full ll:bg-sky-500/15 ll:text-sky-300 ll:ring-1 ll:ring-sky-400/40",
            className,
          )}
          aria-label={label}
        >
          <BadgeCheck className="ll:size-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="ll:z-9999">
        <span className="ll:font-semibold">{label}</span>
      </TooltipContent>
    </Tooltip>
  );
};
