import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateNotification } from "@/hooks/api/use-create-notification";
import {
  MessageType,
  useSendChatMessage,
} from "@/hooks/api/use-send-chat-message";
import { Game } from "@/lib/game";
import { usePartyCommand } from "@/features/command/hooks/use-party-command";
import { getHeroCharacterData } from "@/utils/game/get-hero-character-data";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type OldChatInputProps = {
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
  const { mutate: sendChatMessage } = useSendChatMessage();
  const { mutate: createNotification } = useCreateNotification();
  const { handlePartyCommand } = usePartyCommand();

  const { watch, setValue, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      message: "",
    },
  });

  const messageValue = watch("message");

  const onSubmit = (data: FormData) => {
    if (!selectedGuildId || !world) return;

    if (data.message.startsWith("!grp")) {
      const description = data.message.slice("!grp".length).trim() || undefined;
      handlePartyCommand(description, [selectedGuildId]);
      setValue("message", "");
      return;
    }

    const isCommand = data.message.startsWith("!");
    const message = isCommand ? data.message.slice(1) : data.message;
    const characterData = getHeroCharacterData();

    if (isCommand) {
      createNotification({
        guildIds: [selectedGuildId],
        message,
        world,
      });
      sendChatMessage({
        guildIds: [selectedGuildId],
        message,
        type: MessageType.NOTIFICATION,
        characterData,
      });
    } else {
      sendChatMessage({
        guildIds: [selectedGuildId],
        message: data.message,
        type: MessageType.NORMAL,
        characterData,
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
