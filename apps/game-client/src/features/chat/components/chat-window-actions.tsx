import { useChatStore } from "@/store/chat.store";
import { CHAT_INTEGRATION_ENABLED } from "../chat.constants";
import { ListFilter, Dock, SquareArrowOutUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WindowActionButton } from "@/components/window-action-button";
import { ChatSettingsButton } from "./chat-settings-button";

const ICON_SIZE = 14;

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
      <WindowActionButton
        label={filterLabel}
        pressed={filtersVisible}
        onClick={toggleFiltersVisible}
      >
        <ListFilter size={ICON_SIZE} aria-hidden="true" />
      </WindowActionButton>
      {CHAT_INTEGRATION_ENABLED && (canIntegrate || integrated) && (
        <WindowActionButton label={integrationLabel} onClick={toggleIntegrated}>
          {integrated ? (
            <SquareArrowOutUpRight size={ICON_SIZE} aria-hidden="true" />
          ) : (
            <Dock size={ICON_SIZE} aria-hidden="true" />
          )}
        </WindowActionButton>
      )}
    </div>
  );
};
