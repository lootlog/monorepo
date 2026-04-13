import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateNotification } from "@/hooks/api/use-create-notification";
import {
  MessageType,
  useSendChatMessage,
} from "@/hooks/api/use-send-chat-message";
import { Game } from "@/lib/game";
import { usePartyCommand } from "@/features/command/hooks/use-party-command";
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

    const isNotificationEnabled = data.message.charAt(0) === "!";
    const msg = isNotificationEnabled ? data.message.slice(1) : data.message;

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
