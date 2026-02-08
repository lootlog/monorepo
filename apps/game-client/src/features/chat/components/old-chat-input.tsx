import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateNotification } from "@/hooks/api/use-create-notification";
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
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export type OldChatInputProps = {
  selectedGuildId?: string;
  autofocus?: boolean;
};

const FormSchema = z.object({
  message: z.string().min(1).max(120),
});

type FormData = z.infer<typeof FormSchema>;

export const OldChatInput: FC<OldChatInputProps> = ({
  selectedGuildId,
  autofocus,
}) => {
  const world = Game.getWorldName();
  const { mutate: sendChatMessage, mutateAsync: sendChatMessageAsync } =
    useSendChatMessage();
  const { mutate: createNotification } = useCreateNotification();
  const { mutate: createPartyGathering } = useCreatePartyGathering();
  const { data: session } = useSession();
  const discordId = session?.user?.discordId;
  const setPartyGathering = usePartyFinderStore((s) => s.setPartyGathering);
  const setChatMessageId = usePartyFinderStore((s) => s.setChatMessageId);
  const { setOpen } = useWindowsStore();
  const silentCancel = useSilentCancelPartyGathering();

  const { watch, setValue, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      message: "",
    },
  });

  const messageValue = watch("message");

  const handlePartyCommand = async (description?: string) => {
    if (!selectedGuildId || !world) return;

    await silentCancel();

    const hero = Game.hero;

    createPartyGathering(
      {
        guildIds: [selectedGuildId],
        description,
      },
      {
        onSuccess: async (response) => {
          const notificationId = response.data.notificationId;
          const guildIds = response.data.guildIds ?? [selectedGuildId];

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
            guildIds,
          });

          const chatResults = await sendChatMessageAsync({
            message: hero.nick,
            guildIds,
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
              setChatMessageId(guildIds[index], result.value.data.id);
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

  const onSubmit = (data: FormData) => {
    if (!selectedGuildId || !world) return;

    if (data.message.startsWith("!grp")) {
      const description = data.message.slice("!grp".length).trim() || undefined;
      handlePartyCommand(description);
      setValue("message", "");
      return;
    }

    const isNotificationEnabled = data.message.charAt(0) === "!";
    const msg =
      data.message.indexOf("!") === 0 ? data.message.slice(1) : data.message;

    if (isNotificationEnabled) {
      createNotification({
        guildIds: [selectedGuildId],
        message: msg,
        world,
      });
      sendChatMessage({
        guildIds: [selectedGuildId],
        message: msg,
        type: MessageType.NOTIFICATION,
        characterData: {
          nick: Game.hero.nick,
          id: Game.hero.id,
          acc: Game.hero.account,
          lvl: Game.hero.lvl,
          prof: Game.hero.prof,
          icon: Game.hero.img,
        },
      });
    } else {
      sendChatMessage({
        guildIds: [selectedGuildId],
        message: data.message,
        type: MessageType.NORMAL,
        characterData: {
          nick: Game.hero.nick,
          id: Game.hero.id,
          acc: Game.hero.account,
          lvl: Game.hero.lvl,
          prof: Game.hero.prof,
          icon: Game.hero.img,
        },
      });
    }

    setValue("message", "");
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="ll:flex ll:justify-center ll:flex-col ll:mt-1"
    >
      <Label className="ll:text-[9px] ll:text-gray-400">
        (! = powiadomienie, !grp = szukaj grupy)
      </Label>
      <Input
        autoComplete="off"
        placeholder="Wiadomość..."
        autoFocus={autofocus}
        value={messageValue}
        onChange={(e) => setValue("message", e.target.value)}
      />
    </form>
  );
};
