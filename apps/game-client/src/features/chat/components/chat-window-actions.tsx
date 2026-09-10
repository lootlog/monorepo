import { useChatStore } from "@/store/chat.store";
import { CHAT_INTEGRATION_ENABLED } from "../chat.constants";
import { ListFilter, Dock, SquareArrowOutUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChatActionButton } from "./chat-action-button";
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
    <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-1">
      <ChatSettingsButton />
      <ChatActionButton
        label={filterLabel}
        pressed={filtersVisible}
        onClick={toggleFiltersVisible}
      >
        <ListFilter size={14} aria-hidden="true" />
        {filtersVisible && (
          <span
            aria-hidden="true"
            className="ll:absolute ll:right-0 ll:bottom-0 ll:size-1.5 ll:rounded-full ll:bg-purple-400"
          />
        )}
      </ChatActionButton>
      {CHAT_INTEGRATION_ENABLED && (canIntegrate || integrated) && (
        <ChatActionButton label={integrationLabel} onClick={toggleIntegrated}>
          {integrated ? (
            <SquareArrowOutUpRight size={14} />
          ) : (
            <Dock size={14} />
          )}
        </ChatActionButton>
      )}
    </div>
  );
};
