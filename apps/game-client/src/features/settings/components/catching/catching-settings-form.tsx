import { type FC, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useLootlogCharactersConfig } from "@/hooks/api/use-lootlog-character-config";
import { useUpdateLootlogCharactersConfig } from "@/hooks/api/use-update-lootlog-characters-config";
import { useGuilds } from "@/hooks/api/use-guilds";

type CatchingSettingsFormProps = {
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
  const { data: lootlogCharactersConfig, isPending: isLootlogConfigLoading } =
    useLootlogCharactersConfig();
  const {
    mutate: updateLootlogCharacterConfig,
    isPending: isUpdatingLootlogConfig,
  } = useUpdateLootlogCharactersConfig();
  const { register, watch, reset } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      lootGuildIds: [],
      timersGuildIds: [],
    },
  });
  const configByCharacterId = lootlogCharactersConfig?.[characterId];
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const isResettingRef = useRef(false);
  const mutateRef = useRef(updateLootlogCharacterConfig);

  mutateRef.current = updateLootlogCharacterConfig;

  useEffect(() => {
    if (guilds && guilds.length > 0) {
      isResettingRef.current = true;
      reset({
        lootGuildIds: configByCharacterId?.collectLootWhitelistGuildIds || [],
        timersGuildIds: configByCharacterId?.addTimersWhitelistGuildIds || [],
      });
      setTimeout(() => {
        isResettingRef.current = false;
        isInitializedRef.current = true;
      }, 0);
    }
  }, [
    guilds,
    lootlogCharactersConfig,
    reset,
    characterId,
    configByCharacterId,
  ]);

  useEffect(() => {
    const subscription = watch((value) => {
      if (!isInitializedRef.current || isResettingRef.current) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const lootGuildIds = (value.lootGuildIds || []).filter(
          (id): id is string => typeof id === "string",
        );
        const timerGuildIds = (value.timersGuildIds || []).filter(
          (id): id is string => typeof id === "string",
        );

        mutateRef.current({
          characterId,
          lootGuildIds,
          timerGuildIds,
        });
      }, 500);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [characterId, watch]);

  const isPending = isLootlogConfigLoading || isUpdatingLootlogConfig;

  return (
    <div className="ll:py-4 ll:relative">
      <div className="ll:flex ll:items-center ll:justify-between ll:mb-2 ll:h-4">
        <h4>Wybierz serwery na które zbierać dane:</h4>
        {isPending && (
          <Loader2 className="ll:size-4 ll:animate-spin ll:text-primary" />
        )}
      </div>
      <div>
        <div className="ll:grid ll:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] ll:gap-3">
          {guilds?.map((guild) => (
            <div
              key={guild.id}
              className="ll:border ll:border-gray-600 ll:rounded ll:p-2"
            >
              <div className="ll:font-semibold ll:mb-2 ll:text-sm">
                {guild.name}
              </div>
              <div className="ll:flex ll:flex-col ll:gap-1">
                <div className="checkbox-custom c-checkbox">
                  <input
                    id={`${guild.id}-timers`}
                    type="checkbox"
                    value={guild.id}
                    {...register("timersGuildIds")}
                  />
                  <label htmlFor={`${guild.id}-timers`}>Łap timery</label>
                </div>
                <div className="checkbox-custom c-checkbox">
                  <input
                    id={`${guild.id}-loot`}
                    type="checkbox"
                    value={guild.id}
                    {...register("lootGuildIds")}
                  />
                  <label htmlFor={`${guild.id}-loot`}>Łap loot</label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
