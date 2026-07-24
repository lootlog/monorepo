import { MessageType } from "@/api/chat.api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getChatDensityStyle } from "@/features/chat/chat-density";
import { ChatNpcMessageView } from "@/features/chat/components/chat-npc-message-view";
import { ChatPlayerMessageView } from "@/features/chat/components/chat-player-message-view";
import type { ChatMessageResponseDtoOutput } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
import type { ChatAppearanceSettings, NpcTypeColors } from "@lootlog/types";
import { useTranslation } from "react-i18next";

type ChatAppearancePresetMiniPreviewProps = {
  npcTypeColors: NpcTypeColors;
  settings: ChatAppearanceSettings;
};

const PREVIEW_TIMESTAMP = "2026-07-24T19:37:00.000Z";
const PREVIEW_NPC_ICON = "tyt/maddok-tytan2.gif";

const createNpcPreviewMessage = (
  npcName: string,
  location: string,
): ChatMessageResponseDtoOutput =>
  ({
    id: "preset-preview-npc",
    guildId: "preset-preview-guild",
    message: "",
    senderId: "preset-preview-user",
    timestamp: PREVIEW_TIMESTAMP,
    type: MessageType.NPC,
    characterData: {
      nick: "Lunara",
      id: 1,
      acc: 1,
      lvl: 85,
      prof: "m",
      icon: "",
    },
    npc: {
      id: 101,
      name: npcName,
      icon: PREVIEW_NPC_ICON,
      x: 42,
      y: 18,
      hpp: 100,
      location,
      lvl: 120,
      prof: "m",
      type: 1,
      wt: 80,
    },
    canEdit: false,
    canDelete: false,
  }) as ChatMessageResponseDtoOutput;

export const ChatAppearancePresetMiniPreview = ({
  npcTypeColors,
  settings,
}: ChatAppearancePresetMiniPreviewProps) => {
  const { t } = useTranslation();
  const playerName = t("settings.chat.preview.player");
  const npcMessage = createNpcPreviewMessage(
    t("settings.chat.preview.npc"),
    t("settings.chat.preview.location"),
  );

  return (
    <ScrollArea
      aria-hidden="true"
      className="ll:h-[68px] ll:w-full ll:min-w-0 ll:touch-pan-y ll:rounded-sm ll:border ll:border-gray-700 ll:bg-gray-950/90"
      data-testid="chat-preset-mini-preview"
      style={getChatDensityStyle(settings.fontScalePercent)}
      viewportStyle={{ overscrollBehavior: "contain" }}
    >
      <div
        className="ll:flex ll:min-h-full ll:w-full ll:min-w-0 ll:flex-col ll:p-1.5"
        style={{ gap: settings.messageGapPx }}
      >
        <ChatPlayerMessageView
          all={false}
          appearance={settings}
          body={
            <span className="ll:whitespace-pre-wrap ll:text-gray-100">
              {t("settings.chat.preview.message")}
            </span>
          }
          guildName=""
          isMsgYesterday={false}
          messageId="preset-preview-player"
          sender={
            <strong className="ll:mr-0.5 ll:text-purple-300">
              {playerName}:
            </strong>
          }
          timestamp={PREVIEW_TIMESTAMP}
        />
        <ChatNpcMessageView
          all={false}
          appearance={settings}
          guildName=""
          memberColor="d8b4fe"
          message={npcMessage}
          npcTypeColors={npcTypeColors}
          senderName={playerName}
        />
      </div>
    </ScrollArea>
  );
};
