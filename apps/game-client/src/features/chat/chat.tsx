import { CHAT_INTEGRATION_ENABLED } from "./chat.constants";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useChatMessagesListener } from "@/features/chat/hooks/use-chat-messages";
import { useWindowPresence } from "@/hooks/ui/use-window-presence";
import { getSelectedChatGuildId, useChatStore } from "@/store/chat.store";
import { useGameStore } from "@/store/game.store";
import { useWindowsStore } from "@/store/windows.store";
import { getLootlogHostPortalThemeClassName } from "@/components/ui/theme-boundary";
import { ChatView } from "./chat-view";
import { useIntegratedChatHost } from "./hooks/use-integrated-chat-host";
import { hasCurrentUserMention } from "./chat-mentions.helpers";
import { receiveChatMessage, type ChatReadState } from "./chat-read-state";
import { isHiddenNpcChatMessage } from "./chat.helpers";
import { useChatSettingsDocuments } from "@/hooks/api/use-settings-documents";
import type { ChatScrollPosition } from "./components/chat-transcript";

export const Chat = () => {
  const { t } = useTranslation("chat");
  const isIntegratedMode = useChatStore((state) => state.isIntegratedMode);
  const open = useWindowsStore((state) => state.chat.open);
  useGameStore((state) => state.game?.hero.characterId ?? "");
  const accountId = useGameStore((state) => state.game?.hero.accountId ?? "");
  const gameInterface = useGameStore((state) => state.game?.interface);
  const selectedGuildId = useChatStore(getSelectedChatGuildId);

  const setSelectedGuildId = useChatStore(
    (state) => state.setSelectedChatGuildId,
  );

  const [readStates, setReadStates] = useState<Record<string, ChatReadState>>(
    {},
  );

  const [positions] = useState(() => new Map<string, ChatScrollPosition>());
  const readState = readStates[accountId] ?? {};

  const setReadState = (update: (state: ChatReadState) => ChatReadState) =>
    setReadStates((current) => {
      const before = current[accountId] ?? {};
      const after = update(before);

      return before === after ? current : { ...current, [accountId]: after };
    });

  const integrated = useIntegratedChatHost(
    CHAT_INTEGRATION_ENABLED && isIntegratedMode && gameInterface === "ni",
    t("integration.tab"),
  );

  const isVisible = integrated.target ? integrated.visible : open;
  const { shouldRender } = useWindowPresence(open);
  const { hiddenNpcTypes } = useChatSettingsDocuments();
  const hiddenNpcTypeSet = new Set(hiddenNpcTypes);

  useChatMessagesListener({
    prefetchMembers: isVisible,
    hiddenNpcTypes: hiddenNpcTypeSet,
    onRemoteMessage: (message) => {
      if (isHiddenNpcChatMessage(message, hiddenNpcTypeSet)) return;
      const heroName = useGameStore.getState().game?.hero.name ?? "";

      const attention =
        hasCurrentUserMention(message.message, {
          currentUserNames: [heroName],
        }) || Boolean(heroName && message.replyTo?.senderNick === heroName);

      setReadState((current) =>
        receiveChatMessage(current, message, attention),
      );
    },
  });

  if (!integrated.target && !shouldRender) return null;

  const view = (
    <ChatView
      isOpen={isVisible}
      embedded={Boolean(integrated.target)}
      selectedGuildId={selectedGuildId}
      setSelectedGuildId={(guildId) => setSelectedGuildId(guildId)}
      readState={readState}
      setReadState={setReadState}
      getPosition={(key) => positions.get(`${accountId}:${key}`)}
      savePosition={(key, position) => {
        positions.set(`${accountId}:${key}`, position);
      }}
    />
  );

  if (!integrated.target) return view;

  return createPortal(
    <div
      className={`${getLootlogHostPortalThemeClassName()} ll:flex ll:size-full ll:min-h-0 ll:flex-col ll:bg-background ll:text-foreground`}
    >
      {view}
    </div>,
    integrated.target,
  );
};
