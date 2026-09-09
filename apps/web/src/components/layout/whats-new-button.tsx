import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Sparkles } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

interface WhatsNewButtonProps {
  readonly onClick: () => void;
}

export const WhatsNewButton: FC<WhatsNewButtonProps> = ({ onClick }) => {
  const { t } = useTranslation();
  const label = t("releaseAnnouncements.whatsNew", "Co nowego");

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            aria-label={label}
            variant="ghost"
            className="size-11"
            onClick={onClick}
          >
            <Sparkles className="size-5 text-primary" />
          </Button>
        }
      />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
};
