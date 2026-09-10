import { useWindowsStore } from "@/store/windows.store";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChatActionButton } from "./chat-action-button";

export const ChatSettingsButton = () => {
  const { t } = useTranslation("chat");
  const setOpen = useWindowsStore((state) => state.setOpen);

  return (
    <ChatActionButton
      label={t("actions.openSettings")}
      onClick={() =>
        setOpen("settings", true, {
          activeTab: "chat",
          activeSubsection: "chat-appearance",
        })
      }
    >
      <Settings size={14} aria-hidden="true" />
    </ChatActionButton>
  );
};
