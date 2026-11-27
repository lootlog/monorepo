import { useState } from "react";
import { useChatMessagesListener } from "@/features/chat/hooks/use-chat-messages";
import { useWindowOpen } from "@/hooks/ui/use-window-open";
import { useWindowPresence } from "@/hooks/ui/use-window-presence";
import { getSelectedChatGuildId, useChatStore } from "@/store/chat.store";
import { useGameStore } from "@/store/game.store";
import { ChatView } from "./chat-view";
import { receiveChatMessage, type ChatReadState } from "./chat-read-state";
import { isHiddenNpcChatMessage } from "./chat.helpers";
import { useHiddenNpcTypes } from "@/features/chat/hooks/use-hidden-npc-types";
import type { ChatScrollPosition } from "./components/chat-transcript";

export const Chat = () => {
  const open = useWindowOpen("chat");
  const accountId = useGameStore((state) => state.game?.hero.accountId ?? "");
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

  const { shouldRender } = useWindowPresence(open);
  const { hiddenNpcTypes } = useHiddenNpcTypes();

  useChatMessagesListener({
    prefetchMembers: open,
    hiddenNpcTypes,
    onRemoteMessage: (message) => {
      if (isHiddenNpcChatMessage(message, hiddenNpcTypes)) return;
      setReadState((current) => receiveChatMessage(current, message));
    },
  });

  if (!shouldRender) return null;

  return (
    <ChatView
      isOpen={open}
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
};
