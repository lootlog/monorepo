import { CHAT_INPUT_MAX_LENGTH } from "@/features/chat/chat.constants";
import { useChatControllerSendChatMessage } from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MessageType } from "@/api/chat.api";
import { upsertChatMessage } from "@/features/chat/chat.helpers";
import { updateChatMessagesCache } from "@/features/chat/chat-query-cache.helpers";
import { useNotificationChatOrchestration } from "@/features/chat/hooks/use-notification-chat-orchestration";
import { useVisibleLootlogGuilds } from "@/hooks/use-visible-lootlog-guilds";
import { buildChatCharacterData } from "@/lib/api/generated-helpers";
import { getChatAlarmLocation } from "@/lib/margonem-runtime/adapters/chat-alarm-runtime-adapter";
import { getSelectedChatGuildId } from "@/store/chat.store";
import { useGameStore } from "@/store/game.store";

// Shared by the always-mounted hotkey handler and the visible action strip.
const pendingActions = new Set<string>();

export const useChatQuickActions = () => {
  const { t } = useTranslation("chat");
  const queryClient = useQueryClient();
  const { visibleGuilds, areVisibleGuildsResolved } = useVisibleLootlogGuilds();
  const { mutateAsync: send, isPending } = useChatControllerSendChatMessage();
  const { startNotificationMessage, isCreatingNotificationMessage } =
    useNotificationChatOrchestration();
  const sendPosition = async (guildId = getSelectedChatGuildId()) => {
    if (pendingActions.has("position")) return;
    if (!guildId || !visibleGuilds.some((guild) => guild.id === guildId))
      return;
    const characterData = buildChatCharacterData();
    const location = getChatAlarmLocation();
    if (!characterData || !location) {
      return;
    }
    const prefix = `${characterData.nick}(${characterData.lvl}${characterData.prof}), `;
    const coordinates = ` (${location.x}, ${location.y})`;
    const message =
      prefix +
      location.map.slice(
        0,
        Math.max(0, CHAT_INPUT_MAX_LENGTH - prefix.length - coordinates.length),
      ) +
      coordinates;
    pendingActions.add("position");
    try {
      const result = await send({
        pathParams: { guildId },
        data: { message, type: MessageType.NORMAL, characterData },
      });
      updateChatMessagesCache({
        guildId,
        queryClient,
        updater: (old) => upsertChatMessage(old, result),
      });
    } catch {
      // Keep drafts and existing state intact; failed actions are not retried.
    } finally {
      pendingActions.delete("position");
    }
  };
  const sendHelp = async (selectedGuildId = getSelectedChatGuildId()) => {
    if (pendingActions.has("help")) return;
    const game = useGameStore.getState().game;
    const characterData = buildChatCharacterData();
    const location = getChatAlarmLocation();
    if (!game || !characterData || !location) {
      return;
    }
    const guildId = selectedGuildId;
    if (!areVisibleGuildsResolved) {
      return;
    }
    if (!guildId || !visibleGuilds.some((guild) => guild.id === guildId)) {
      return;
    }
    const enemyText =
      location.enemyCount === undefined
        ? ""
        : t("quickActions.enemyCount", { count: location.enemyCount });
    const fixedText =
      t("quickActions.helpMessage", { map: "", x: location.x, y: location.y }) +
      enemyText;
    const map = location.map.slice(
      0,
      Math.max(0, CHAT_INPUT_MAX_LENGTH - fixedText.length),
    );
    const message =
      t("quickActions.helpMessage", { ...location, map }) + enemyText;
    pendingActions.add("help");
    try {
      const { result } = await startNotificationMessage({
        guildIds: [guildId],
        world: game.world,
        message,
        sendChatMessage: (guildIds) =>
          send({
            pathParams: { guildId: guildIds[0] ?? guildId },
            data: { message, type: MessageType.NOTIFICATION, characterData },
          }),
      });
      updateChatMessagesCache({
        guildId,
        queryClient,
        updater: (old) => upsertChatMessage(old, result),
      });
    } catch {
      // Keep drafts and existing state intact; failed actions are not retried.
    } finally {
      pendingActions.delete("help");
    }
  };
  return {
    sendPosition,
    sendHelp,
    isPending: isPending || isCreatingNotificationMessage,
  };
};
