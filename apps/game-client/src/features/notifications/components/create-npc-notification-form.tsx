import { ScrollArea } from "@/components/ui/scroll-area";
import { useGuilds } from "@/hooks/api/use-guilds";
import { FC, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { GameNpc } from "@/types/margonem/npcs";
import { Button } from "@/components/ui/button";
import { useWindowsStore } from "@/store/windows.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useCreateNotification } from "@/hooks/api/use-create-notification";
import { useGlobalStore } from "@/store/global.store";
import { Game } from "@/lib/game";

export type CreateNpcNotificationForm = {
  npc?: GameNpc;
};

const FormSchema = z.object({
  guildIds: z.array(z.string()),
});

type FormData = z.infer<typeof FormSchema>;

export const CreateNpcNotificationForm: FC<CreateNpcNotificationForm> = ({
  npc,
}) => {
  const { data: guilds } = useGuilds();
  const { setOpen } = useWindowsStore();
  const { mutate: createNotification, isPending } = useCreateNotification();
  const { world } = useGlobalStore((store) => store.gameState);
  const location = Game.map.name;

  const { register, handleSubmit, watch, reset } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      guildIds: [],
    },
  });

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    if (!npc?.id || !world) return;

    createNotification(
      {
        guildIds: values.guildIds,
        world,
        npc: {
          ...npc,
          hpp: 0,
          location,
          name: npc.nick,
        },
      },
      {
        onSuccess: () => {
          setOpen("create-notification", false, { npc: undefined });
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="ll-py-4 ll-px-2">
        <div>
          <h4 className="ll-mb-2">Wyślij powiadomienie na:</h4>
          <ScrollArea className="ll-flex ll-flex-col ll-h-32" type="auto">
            {guilds?.map((guild) => {
              const id = `${guild.id}-timers`;

              return (
                <div key={guild.id} className="checkbox-custom c-checkbox">
                  <input
                    id={id}
                    type="checkbox"
                    value={guild.id}
                    {...register(`guildIds`)}
                  />
                  <label htmlFor={id}>{guild.name}</label>
                </div>
              );
            })}
          </ScrollArea>
        </div>
      </div>
      <div className="ll-w-full ll-flex ll-justify-center ll-mt-4 ll-p-4 ll-box-border">
        <Button disabled={isPending} type="submit" className="ll-px-8">
          {isPending ? "Wysyłanie..." : "Wyślij"}
        </Button>
      </div>
    </form>
  );
};
