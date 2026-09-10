import { useChatStore } from "@/store/chat.store";
import { CHAT_INTEGRATION_ENABLED } from "../chat.constants";
import { ListFilter, Dock, SquareArrowOutUpRight } from "lucide-react";
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

const actionButtonStyle = {
  appearance: "none",
  background: "transparent",
  border: 0,
  padding: 0,
  margin: 0,
  color: "inherit",
} as const;

export const ChatWindowActions = ({
  integrated,
  canIntegrate,
  toggleIntegrated,
}: ChatWindowActionsProps) => {
  const { t } = useTranslation("chat");
  const filtersVisible = useChatStore((state) => state.filtersVisible);
  const toggleFiltersVisible = useChatStore(
    (state) => state.toggleFiltersVisible,
  );
  const filterLabel = t(
    filtersVisible ? "actions.hideFilters" : "actions.showFilters",
  );
  const integrationLabel = integrated
    ? t("integration.detach")
    : t("integration.attach");
  return (
    <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            style={actionButtonStyle}
            className="ll-custom-cursor-pointer ll:relative ll:flex ll:size-5 ll:items-center ll:justify-center ll:rounded-sm ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
            aria-label={filterLabel}
            aria-pressed={filtersVisible}
            onClick={toggleFiltersVisible}
          >
            <ListFilter size={14} aria-hidden="true" />
            {filtersVisible && (
              <span
                aria-hidden="true"
                className="ll:absolute ll:right-0 ll:bottom-0 ll:size-1.5 ll:rounded-full ll:bg-purple-400"
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{filterLabel}</TooltipContent>
      </Tooltip>
      {CHAT_INTEGRATION_ENABLED && (canIntegrate || integrated) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              style={actionButtonStyle}
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
