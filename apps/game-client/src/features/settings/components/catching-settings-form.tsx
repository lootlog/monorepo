import { ScrollArea } from "@/components/ui/scroll-area";
import { useGuilds } from "@/hooks/api/use-guilds";
import { FC, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLootlogCharactersConfig } from "@/hooks/api/use-lootlog-character-config";
import { useUpdateLootlogCharactersConfig } from "@/hooks/api/use-update-lootlog-characters-config";

export type CatchingSettingsFormProps = {
  characterId: string;
};

const FormSchema = z.object({
  lootGuildIds: z.array(z.string()),
  timersGuildIds: z.array(z.string()),
});

type FormData = z.infer<typeof FormSchema>;

export const CatchingSettingsForm: FC<CatchingSettingsFormProps> = ({
  characterId,
}) => {
  const { data: guilds } = useGuilds();
  const { data: lootlogCharactersConfig } = useLootlogCharactersConfig();
  const { mutate: updateLootlogCharacterConfig, isPending } =
    useUpdateLootlogCharactersConfig();
  const { register, handleSubmit, watch, reset } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      lootGuildIds: [],
      timersGuildIds: [],
    },
  });
  const configByCharacterId = lootlogCharactersConfig?.[characterId];

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    console.log(values);
    console.log(lootlogCharactersConfig);
    updateLootlogCharacterConfig({
      characterId,
      lootGuildIds: values.lootGuildIds,
      timerGuildIds: values.timersGuildIds,
    });
  };

  useEffect(() => {
    if (guilds && guilds.length > 0) {
      reset({
        lootGuildIds: configByCharacterId?.collectLootBlaclistGuildIds || [],
        timersGuildIds: configByCharacterId?.addTimersBlacklistGuildIds || [],
      });
    }
  }, [guilds, lootlogCharactersConfig, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="ll-grid ll-grid-cols-2 ll-gap-2">
        <div>
          <h4 className="ll-mb-2">Nie łap timerów na:</h4>
          <ScrollArea className="ll-flex ll-flex-col ll-h-24" type="auto">
            {guilds?.map((guild) => {
              const id = `${guild.id}-timers`;

              return (
                <div
                  key={guild.id}
                  className="checkbox-custom c-checkbox"
                  onClick={console.log}
                >
                  <input
                    id={id}
                    type="checkbox"
                    value={guild.id}
                    {...register(`timersGuildIds`)}
                  />
                  <label htmlFor={id}>{guild.name}</label>
                </div>
              );
            })}
          </ScrollArea>
        </div>
        <div>
          <h4 className="ll-mb-2">Nie łap lootu na:</h4>
          <ScrollArea className="ll-flex ll-flex-col ll-h-24" type="auto">
            {guilds?.map((guild) => {
              const id = `${guild.id}-loots`;

              return (
                <div
                  key={guild.id}
                  className="checkbox-custom c-checkbox"
                  onClick={() => console.log(guild.id)}
                >
                  <input
                    id={id}
                    type="checkbox"
                    value={guild.id}
                    {...register("lootGuildIds")}
                  />
                  <label htmlFor={id}>{guild.name}</label>
                </div>
              );
            })}
          </ScrollArea>
        </div>
      </div>
      <div className="ll-w-full ll-flex ll-justify-center ll-mt-4">
        <button
          type="submit"
          className="ll-text-[12px] ll-border ll-border-gray-400 ll-bg-gray-400/30 hover:ll-bg-gray-400/50 ll-rounded-sm ll-h-5 ll-text-white"
          disabled={isPending}
        >
          {isPending ? "Zapisywanie..." : "Zapisz"}
        </button>
      </div>
    </form>
  );
};
