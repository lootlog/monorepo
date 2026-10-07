import { useTranslation } from "react-i18next";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { useWindowsStore } from "@/store/windows.store";
import { GlobalChatContent } from "./components/global-chat-content";
import { GlobalChatOnline } from "./components/global-chat-online";

/** The plain-text chat shared by every Member of every Organization. */
export const GlobalChat = () => {
  const { t } = useTranslation("globalChat");
  const open = useWindowsStore((state) => state["global-chat"].open);
  const setOpen = useWindowsStore((state) => state.setOpen);

  return (
    <DraggableWindow
      isOpen={open}
      id="global-chat"
      title={t("window.title")}
      onClose={() => setOpen("global-chat", false)}
      actions=<GlobalChatOnline />
      contentClassName="ll:-mx-1 ll:-mb-1"
      minHeight={180}
      minWidth={242}
    >
      <GlobalChatContent />
    </DraggableWindow>
  );
};
