import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateNotification } from "@/hooks/api/use-create-notification";
import { useSendChatMessage } from "@/hooks/api/use-send-chat-message";
import { useGlobalStore } from "@/store/global.store";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export type ChatInputProps = {
  selectedGuildId?: string;
  autofocus?: boolean;
};

const FormSchema = z.object({
  message: z.string().min(1).max(120),
});

type FormData = z.infer<typeof FormSchema>;

export const ChatInput: FC<ChatInputProps> = ({
  selectedGuildId,
  autofocus,
}) => {
  const { world } = useGlobalStore((state) => state.gameState);
  const { mutate: sendChatMessage } = useSendChatMessage();
  const { mutate: createNotification } = useCreateNotification();

  const { watch, setValue, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      message: "",
    },
  });

  const messageValue = watch("message");

  const onSubmit = (data: FormData) => {
    if (!selectedGuildId || !world) return;

    if (data.message.charAt(0) === "!") {
      createNotification({
        guildIds: [selectedGuildId],
        message: data.message.slice(1),
        world,
      });
      sendChatMessage({ guildIds: [selectedGuildId], message: data.message });
    } else {
      sendChatMessage({ guildIds: [selectedGuildId], message: data.message });
    }

    setValue("message", "");
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="ll:flex ll:justify-center ll:flex-col"
    >
      <Label className="ll:text-[9px] ll:text-gray-400">
        (zacznij od !, aby wysłać powiadomienie)
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
