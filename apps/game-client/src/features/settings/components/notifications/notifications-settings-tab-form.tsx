import { Checkbox } from "@/components/ui/checkbox";
import { useGuilds } from "@/hooks/api/use-guilds";
import { NpcType } from "@/hooks/api/use-npcs";
import {
  NotificationsSettings,
  recommendedSettings,
  useNotificationsStore,
} from "@/store/notifications.store";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDeepCompareEffect } from "react-use";
import { z } from "zod";

export type NotificationsSettingsTabFormProps = {
  characterId?: number;
};

const mainFields = [
  { label: "Elita 2", key: NpcType.ELITE2 },
  { label: "Heros", key: NpcType.HERO },
  { label: "Kolos", key: NpcType.COLOSSUS },
  { label: "Tytan", key: NpcType.TITAN },
] as const;

const FormSchema = z.object({
  settingsByNpcType: z.record(
    z.enum([NpcType.ELITE2, NpcType.HERO, NpcType.COLOSSUS, NpcType.TITAN]),
    z.object({
      show: z.boolean(),
      highlight: z.boolean(),
      guildIds: z.array(z.string()),
    })
  ),
});

type FormData = z.infer<typeof FormSchema>;

export const NotificationsSettingsTabForm: FC<
  NotificationsSettingsTabFormProps
> = ({ characterId }) => {
  const { settings, setSettings } = useNotificationsStore();
  const { data: guilds } = useGuilds();

  const currentSettings: NotificationsSettings =
    (characterId && settings?.[characterId]) || recommendedSettings;

  const defaultValues: FormData = {
    settingsByNpcType: currentSettings,
  };

  const { register, watch, getValues, reset } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [characterId, settings, reset]);

  function onSubmit(data: FormData) {
    if (!characterId) return;
    setSettings(
      characterId?.toString(),
      data.settingsByNpcType as NotificationsSettings
    );
  }

  const watchedData = watch();
  useDeepCompareEffect(() => {
    onSubmit(watchedData);
  }, [watchedData]);

  return (
    <form className="ll-h-full ll-py-4">
      <div className="ll-flex-1">
        <span className="ll-grid ll-grid-cols-2 ll-gap-y-6 ll-mb-2">
          {mainFields.map((field) => {
            const watchShow = watch(`settingsByNpcType.${field.key}.show`);

            return (
              <span key={field.key}>
                <div className="ll-font-semibold ll-mb-2">{field.label}</div>
                <Checkbox
                  id={`${field.key}-detect`}
                  {...register(`settingsByNpcType.${field.key}.show`)}
                >
                  Wyświetlaj
                </Checkbox>
                <Checkbox
                  id={`${field.key}-highlight`}
                  disabled={!watchShow}
                  {...register(`settingsByNpcType.${field.key}.highlight`)}
                >
                  Podświetlenie
                </Checkbox>
                <div className="ll-mt-2">
                  <span className="ll-font-semibold">Z jakich serwerów:</span>
                  <div className="ll-mt-2">
                    {guilds?.map((guild) => {
                      const id = `${field.key}-${guild.id}`;
                      return (
                        <Checkbox
                          key={id}
                          id={id}
                          type="checkbox"
                          disabled={!watchShow}
                          value={guild.id}
                          {...register(
                            `settingsByNpcType.${field.key}.guildIds`
                          )}
                        >
                          {guild.name}
                        </Checkbox>
                      );
                    })}
                  </div>
                </div>
              </span>
            );
          })}
        </span>
      </div>
    </form>
  );
};
