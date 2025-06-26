import { Checkbox } from "@/components/ui/checkbox";
import { useGuilds } from "@/hooks/api/use-guilds";
import { NpcType } from "@/hooks/api/use-npcs";
import {
  NpcDetectorSettings,
  recommendedSettings,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDeepCompareEffect } from "react-use";
import { z } from "zod";

export type DetectorSettingsTabFormProps = {
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
      detect: z.boolean(),
      notifyWindow: z.boolean(),
      autoNotifyClan: z.boolean(),
      autoNotifyChat: z.boolean(),
      // notifySound: z.boolean(),
      highlight: z.boolean(),
      guildIds: z.array(z.string()),
    })
  ),
});

type FormData = z.infer<typeof FormSchema>;

export const DetectorSettingsTabForm: FC<DetectorSettingsTabFormProps> = ({
  characterId,
}) => {
  const { settings, setSettings } = useNpcDetectorStore();
  const { data: guilds } = useGuilds();

  const currentSettings: NpcDetectorSettings =
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
  }, [characterId, settings, reset]); // reset w depsach

  function onSubmit(data: FormData) {
    if (!characterId) return;
    setSettings(
      characterId?.toString(),
      data.settingsByNpcType as NpcDetectorSettings
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
            const watchDetect = watch(`settingsByNpcType.${field.key}.detect`);

            return (
              <span key={field.key}>
                <div className="ll-font-semibold ll-mb-2">{field.label}</div>
                <Checkbox
                  id={`${field.key}-detect`}
                  {...register(`settingsByNpcType.${field.key}.detect`)}
                >
                  Wykrywaj
                </Checkbox>
                <Checkbox
                  id={`${field.key}-notifyWindow`}
                  disabled={!watchDetect}
                  {...register(`settingsByNpcType.${field.key}.notifyWindow`)}
                >
                  Okno powiadomienia
                </Checkbox>
                <Checkbox
                  id={`${field.key}-autoNotifyClan`}
                  disabled={!watchDetect}
                  {...register(`settingsByNpcType.${field.key}.autoNotifyClan`)}
                >
                  Auto komunikat
                </Checkbox>
                <Checkbox
                  id={`${field.key}-autoNotifyChat`}
                  disabled={!watchDetect}
                  {...register(`settingsByNpcType.${field.key}.autoNotifyChat`)}
                >
                  Auto wiadomość na czacie
                </Checkbox>
                {/* <Checkbox
                  id={`${field.key}-notifySound`}
                  disabled={!watchDetect}
                  {...register(`settingsByNpcType.${field.key}.notifySound`)}
                >
                  Powiadom dźwiękiem
                </Checkbox> */}
                <Checkbox
                  id={`${field.key}-highlight`}
                  disabled={!watchDetect}
                  {...register(`settingsByNpcType.${field.key}.highlight`)}
                >
                  Podświetlenie
                </Checkbox>
                <div className="ll-mt-2">
                  <span className="ll-font-semibold">
                    Na jakie serwery wysyłać:
                  </span>
                  <div className="ll-mt-2">
                    {guilds?.map((guild) => {
                      const id = `${field.key}-${guild.id}`;
                      return (
                        <Checkbox
                          key={id}
                          id={id}
                          type="checkbox"
                          disabled={!watchDetect}
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
