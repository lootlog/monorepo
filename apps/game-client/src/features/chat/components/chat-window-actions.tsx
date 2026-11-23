import { useChatStore } from "@/store/chat.store";
import { ListFilter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import { ChatSettingsButton } from "./chat-settings-button";

export const ChatWindowActions = () => {
  const { t } = useTranslation("chat");
  const filtersVisible = useChatStore((state) => state.filtersVisible);

  const toggleFiltersVisible = useChatStore(
    (state) => state.toggleFiltersVisible,
  );

  const filterLabel = t(
    filtersVisible ? "actions.hideFilters" : "actions.showFilters",
  );

  return (
    <div className="ll:flex ll:shrink-0 ll:items-center">
      <ChatSettingsButton />
      <IconButton
        label={filterLabel}
        active={filtersVisible}
        onClick={toggleFiltersVisible}
      >
        <ListFilter size={14} aria-hidden="true" />
      </IconButton>
    </div>
  );
};
