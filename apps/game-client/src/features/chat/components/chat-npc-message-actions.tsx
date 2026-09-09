import { CHAT_INPUT_MAX_LENGTH } from "@/features/chat/chat.constants";
import type { ChatMessageResponseDtoOutput } from "@lootlog/client/main";
import { AtSign, Megaphone, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/store/chat.store";
import { useGameStore } from "@/store/game.store";
import { usePartyGatheringOrchestration } from "@/features/party-finder/hooks/use-party-gathering-orchestration";
import { getChatNpcLocation, toChatGameNpc } from "./chat-message.helpers";

type Props = {
  message: ChatMessageResponseDtoOutput;
  onReply?: () => void;
  onMention?: () => void;
};

export function ChatNpcMessageActions({ message, onMention }: Props) {
  const { t } = useTranslation("chat");
  const world = useGameStore((state) => state.game?.world);
  const { startNpcPartyGathering, isCreatingNpcPartyGathering } =
    usePartyGatheringOrchestration();
  const npc = message.npc;
  if (!npc) return null;
  const location = getChatNpcLocation(npc);
  const canActOnLocation = Boolean(world && npc.world === world);

  const prepareHelp = () => {
    if (useGameStore.getState().game?.world !== npc.world || !npc.world) return;
    const store = useChatStore.getState();
    if (store.draftsByGuild[message.guildId]?.trim()) {
      return;
    }
    const text = t("messageActions.npcHelp", { npc: npc.name, location });
    if (text.length > CHAT_INPUT_MAX_LENGTH) {
      return;
    }
    store.setDraft(message.guildId, text);
    store.requestComposeFocus(message.guildId);
  };
  const gather = async () => {
    if (useGameStore.getState().game?.world !== npc.world || !npc.world) return;
    if (!world || npc.x === undefined || npc.y === undefined) {
      return;
    }
    try {
      await startNpcPartyGathering({
        npc: {
          ...toChatGameNpc(npc),
          location: npc.location,
          notificationSent: false,
        },
        guildIds: [message.guildId],
        world,
        openPartyFinder: false,
      });
    } catch {
      // Keep drafts and existing state intact; failed actions are not retried.
    }
  };
  return (
    <div className="ll:mt-1 ll:flex ll:flex-wrap ll:items-center ll:gap-1">
      <Button
        variant="ghost"
        className="ll:h-6 ll:gap-1 ll:px-1.5"
        disabled={isCreatingNpcPartyGathering || !canActOnLocation}
        title={!canActOnLocation ? t("messageActions.otherWorld") : undefined}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => void gather()}
      >
        <Users className="ll:size-3" />
        {t("messageActions.gather")}
      </Button>
      {onMention && (
        <Button
          variant="ghost"
          className="ll:size-6"
          aria-label={t("messageActions.mention")}
          title={t("messageActions.mention")}
          onClick={onMention}
        >
          <AtSign className="ll:size-3" />
        </Button>
      )}
      <Button
        variant="ghost"
        className="ll:size-6"
        aria-label={t("messageActions.prepareHelp")}
        title={
          canActOnLocation
            ? t("messageActions.prepareHelp")
            : t("messageActions.otherWorld")
        }
        disabled={!canActOnLocation}
        onClick={prepareHelp}
      >
        <Megaphone className="ll:size-3" />
      </Button>
    </div>
  );
}
