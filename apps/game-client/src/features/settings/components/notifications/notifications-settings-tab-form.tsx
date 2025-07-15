import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCharacterList } from "@/hooks/api/use-character-list";
import { useGuilds } from "@/hooks/api/use-guilds";
import { NpcType } from "@/hooks/api/use-npcs";
import {
  NotificationsSettings,
  recommendedSettings,
  useNotificationsStore,
} from "@/store/notifications.store";
import { getTextColor } from "@/utils/notifications-and-detector/background";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDeepCompareEffect } from "react-use";
import { z } from "zod";

export type NotificationsSettingsTabFormProps = {
  characterId?: number;
};

const mainFields = [
  { label: "Komunikaty", key: "message" },
  { label: "Elita 2", key: NpcType.ELITE2 },
  { label: "Heros", key: NpcType.HERO },
  { label: "Kolos", key: NpcType.COLOSSUS },
  { label: "Tytan", key: NpcType.TITAN },
] as const;

const FormSchema = z.object({
  settingsByNpcType: z.record(
    z.enum([
      NpcType.ELITE2,
      NpcType.HERO,
      NpcType.COLOSSUS,
      NpcType.TITAN,
      "message",
    ]),
    z.object({
      show: z.boolean(),
      highlight: z.boolean(),
      ignoreOtherWorlds: z.boolean(),
      autoHideTimeout: z.number().min(0).optional(),
      guildIds: z.array(z.string()),
    })
  ),
});

type FormData = z.infer<typeof FormSchema>;

export const NotificationsSettingsTabForm: FC<
  NotificationsSettingsTabFormProps
> = ({ characterId }) => {
  const { settings, setSettings, setState } = useNotificationsStore();
  const { data: characters } = useCharacterList();
  const { data: guilds } = useGuilds();

  const currentSettings: NotificationsSettings =
    (characterId && settings?.[characterId]) || recommendedSettings;

  const defaultValues: FormData = {
    settingsByNpcType: currentSettings,
  };

  const { register, watch, reset } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  function onSubmit(data: FormData) {
    if (!characterId) return;
    setSettings(
      characterId.toString(),
      data.settingsByNpcType as NotificationsSettings
    );
  }

  const watchedData = watch();
  useDeepCompareEffect(() => {
    onSubmit(watchedData);
  }, [watchedData]);

  function applyToAll(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const characterIds = characters?.map((c) => c.id.toString()) || [];

    setState(
      characterIds.reduce(
        (acc, id) => {
          acc[id] = Object.fromEntries(
            mainFields.map((field) => [
              field.key,
              watchedData.settingsByNpcType[field.key] ??
                recommendedSettings[field.key],
            ])
          ) as NotificationsSettings;
          return acc;
        },
        {} as Record<string, NotificationsSettings>
      )
    );
  }

  const renderField = (field: (typeof mainFields)[number]) => {
    const watchShow = watchedData.settingsByNpcType[field.key]?.show;
    const textColor = getTextColor(field.key, true);

    return (
      <span key={field.key}>
        <div className="ll-font-semibold ll-mb-1">{field.label}</div>
        <Checkbox
          id={`${field.key}-show`}
          {...register(`settingsByNpcType.${field.key}.show`)}
        >
          Wyświetlaj
        </Checkbox>
        <Checkbox
          id={`${field.key}-ignore-other-worlds`}
          disabled={!watchShow}
          {...register(`settingsByNpcType.${field.key}.ignoreOtherWorlds`)}
        >
          Ignoruj inne światy
        </Checkbox>
        <Checkbox
          id={`${field.key}-highlight`}
          disabled={!watchShow}
          labelStyle={{ color: textColor }}
          {...register(`settingsByNpcType.${field.key}.highlight`)}
        >
          Podświetlenie
        </Checkbox>
        <div className="ll-mt-2">
          <Label>Auto ukrywanie: (sekundy)</Label>
          <Input
            id={`${field.key}-auto-hide-timeout`}
            type="number"
            disabled={!watchShow}
            className="!ll-w-16 !ll-mt-1"
            placeholder="0"
            {...register(`settingsByNpcType.${field.key}.autoHideTimeout`)}
          />
        </div>
        <div className="ll-mt-2">
          <span className="ll-font-semibold">Z jakich serwerów:</span>
          <div className="ll-mt-1">
            {guilds?.map((guild) => {
              const id = `${field.key}-${guild.id}`;
              return (
                <Checkbox
                  key={id}
                  id={id}
                  type="checkbox"
                  disabled={!watchShow}
                  value={guild.id}
                  {...register(`settingsByNpcType.${field.key}.guildIds`)}
                >
                  {guild.name}
                </Checkbox>
              );
            })}
          </div>
        </div>
      </span>
    );
  };

  return (
    <form className="ll-h-full ll-py-4">
      <div className="ll-flex-1">
        <div className="ll-pb-2">
          <Button onClick={applyToAll}>Aplikuj do wszystkich postaci</Button>
        </div>
        <span className="ll-grid ll-grid-cols-2 ll-gap-y-4 ll-mb-12">
          {mainFields.map(renderField)}
        </span>
      </div>
    </form>
  );
};
