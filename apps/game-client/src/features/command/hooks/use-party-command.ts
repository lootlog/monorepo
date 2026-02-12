import { useCreatePartyGathering } from "@/hooks/api/use-create-party-gathering";
import { useSilentCancelPartyGathering } from "@/hooks/api/use-silent-cancel-party-gathering";
import {
  MessageType,
  useSendChatMessage,
} from "@/hooks/api/use-send-chat-message";
import { useSession } from "@/hooks/auth/use-session";
import { Game } from "@/lib/game";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import axios from "axios";

export const usePartyCommand = () => {
  const { mutate: createPartyGathering } = useCreatePartyGathering();
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
        guildIds,
        description,
      },
      {
        onSuccess: async (response) => {
          const notificationId = response.data.notificationId;
          const responseGuildIds = response.data.guildIds ?? guildIds;

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
            characterData: {
              nick: hero.nick,
              id: hero.id,
              acc: hero.account,
              lvl: hero.lvl,
              prof: hero.prof,
              icon: hero.img,
            },
            partyGathering: {
              notificationId,
              discordId: discordId || "",
              description,
              world,
            },
          });

          chatResults.forEach((result, index) => {
            if (result.status === "fulfilled" && result.value?.data?.id) {
              setChatMessageId(responseGuildIds[index], result.value.data.id);
            }
          });

          setOpen("party-finder", true);
        },
        onError: (error) => {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            if (status === 403) {
              window.message("Brak uprawnień do wysyłania ogłoszeń");
            } else if (status === 429) {
              window.message("Zbyt wiele prób. Spróbuj za chwilę.");
            } else if (status === 400) {
              window.message(
                error.response?.data?.message || "Nieprawidłowe dane",
              );
            } else {
              window.message("Nie udało się utworzyć ogłoszenia");
            }
          } else {
            window.message("Nie udało się utworzyć ogłoszenia");
          }
        },
      },
    );
  };

  return { handlePartyCommand };
};
