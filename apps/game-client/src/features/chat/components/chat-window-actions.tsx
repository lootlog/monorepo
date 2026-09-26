import { useChatStore } from "@/store/chat.store";
import { CHAT_INTEGRATION_ENABLED } from "../chat.constants";
import { ListFilter, Dock, SquareArrowOutUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import { ChatSettingsButton } from "./chat-settings-button";

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
    <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-0.5">
      <ChatSettingsButton />
      <IconButton
        label={filterLabel}
        active={filtersVisible}
        onClick={toggleFiltersVisible}
      >
        <ListFilter size={14} aria-hidden="true" />
      </IconButton>
      {CHAT_INTEGRATION_ENABLED && (canIntegrate || integrated) && (
        <IconButton label={integrationLabel} onClick={toggleIntegrated}>
          {integrated ? (
            <SquareArrowOutUpRight size={14} />
          ) : (
            <Dock size={14} />
          )}
        </IconButton>
      )}
    </div>
  );
};
