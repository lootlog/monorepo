import { Dock, SquareArrowOutUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ChatWindowActionsProps = {
  integrated: boolean;
  canIntegrate: boolean;
  toggleIntegrated: () => void;
};

export const ChatWindowActions = ({
  integrated,
  canIntegrate,
  toggleIntegrated,
}: ChatWindowActionsProps) => {
  const { t } = useTranslation("chat");
  const integrationLabel = integrated
    ? t("integration.detach")
    : t("integration.attach");
  const style = {
    appearance: "none",
    background: "transparent",
    border: 0,
    padding: 0,
    margin: 0,
    color: "inherit",
  } as const;
  return (
    <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-1">
      {(canIntegrate || integrated) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              style={style}
              className="ll-custom-cursor-pointer ll:flex ll:size-5 ll:items-center ll:justify-center ll:rounded-sm ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
              aria-label={integrationLabel}
              onClick={toggleIntegrated}
            >
              {integrated ? (
                <SquareArrowOutUpRight size={14} />
              ) : (
                <Dock size={14} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{integrationLabel}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
