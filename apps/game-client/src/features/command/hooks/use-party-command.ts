import { useSilentCancelPartyGathering } from "@/hooks/api/use-silent-cancel-party-gathering";
import { MessageType } from "@/api/chat.api";
import { useSendChatMessage } from "@/hooks/api/use-send-chat-message";
import { useMessagingControllerCreatePartyGathering } from "@/lib/api/generated/main/messaging/messaging";
import {
  buildCurrentCharacterPayload,
  buildChatCharacterData,
} from "@/lib/api/generated-helpers";
import { useSession } from "@/hooks/auth/use-session";
import { Game } from "@/lib/game";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import { getCreatePartyGatheringErrorMessage } from "@/features/party-finder/get-create-party-gathering-error-message";

export const usePartyCommand = () => {
  const { mutate: createPartyGathering } =
    useMessagingControllerCreatePartyGathering();
  const { mutateAsync: sendChatMessageAsync } = useSendChatMessage();
  const { data: session } = useSession();
  const discordId = session?.user?.discordId;
  const setPartyGathering = usePartyFinderStore((s) => s.setPartyGathering);
  const setChatMessageId = usePartyFinderStore((s) => s.setChatMessageId);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const silentCancel = useSilentCancelPartyGathering();

  const handlePartyCommand = async (
    description: string | undefined,
    guildIds: string[],
  ) => {
    const world = Game.getWorldName();
    if (guildIds.length === 0 || !world) return;

    await silentCancel();

    const hero = Game.hero;

    createPartyGathering(
      {
        data: {
          guildIds,
          world,
          character: buildCurrentCharacterPayload(),
          description,
        },
      },
      {
        onSuccess: async (response) => {
          const notificationId = response.notificationId;
          const responseGuildIds = response.guildIds ?? guildIds;

          setPartyGathering({
            notificationId,
            discordId: discordId || "",
            character: {
              nick: hero.nick,
              lvl: hero.lvl,
              prof: hero.prof,
              characterId: String(hero.id),
              accountId: String(hero.account),
              icon: hero.img,
              clan: hero.clan
                ? { id: hero.clan.id, name: hero.clan.name }
                : undefined,
            },
            description,
            world,
            createdAt: new Date().toISOString(),
            guildIds: responseGuildIds,
          });

          const chatResults = await sendChatMessageAsync({
            message: hero.nick,
            guildIds: responseGuildIds,
            type: MessageType.PARTY_GATHERING,
            characterData: buildChatCharacterData(),
            partyGathering: {
              notificationId,
              discordId: discordId || "",
              description,
              world,
            },
          });

          chatResults.forEach((result, index) => {
            if (result.status === "fulfilled" && result.value?.messageId) {
              setChatMessageId(responseGuildIds[index], result.value.messageId);
            }
          });

          setOpen("party-finder", true);
        },
        onError: (error) => {
          window.message(getCreatePartyGatheringErrorMessage(error));
        },
      },
    );
  };

  return { handlePartyCommand };
};
