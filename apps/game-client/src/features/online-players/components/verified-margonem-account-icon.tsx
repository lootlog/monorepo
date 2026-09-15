import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import { Check } from "lucide-react";
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
            "ll:inline-flex ll:size-3.5 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-full ll:text-sky-400/80",
            className,
          )}
          aria-label={label}
        >
          <Check aria-hidden="true" strokeWidth={2.5} className="ll:size-2.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="ll:font-semibold">{label}</span>
      </TooltipContent>
    </Tooltip>
  );
};
