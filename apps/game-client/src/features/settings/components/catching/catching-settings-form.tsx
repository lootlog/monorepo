import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsGuildSelectionGrid } from "@/features/settings/components/shared/settings-guild-selection-grid";
import { type FC, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useUpdateLootlogCharactersConfig } from "@/hooks/api/use-update-lootlog-characters-config";
import { useTranslation } from "react-i18next";
import {
  useUsersControllerGetCurrentUserAccessibleGuilds,
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  useUserLootlogConfigControllerGetUserLootlogConfigByAccountId,
} from "@lootlog/client/main";

import { useGameStore } from "@/store/game.store";

type CatchingSettingsFormProps = {
  characterId: string;
  disabled?: boolean;
  onSelectionChange?: (catchingGuildIds: string[]) => void;
};

const FormSchema = z.object({
  catchingGuildIds: z.array(z.string()),
});

type FormData = z.infer<typeof FormSchema>;

export const CatchingSettingsForm: FC<CatchingSettingsFormProps> = ({
  characterId,
  disabled = false,
  onSelectionChange,
}) => {
  const { t } = useTranslation();
  const accountId = useGameStore((state) => state.game?.hero.accountId ?? "");
  const queryKey =
    getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
      accountId,
    });
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();
  const { data: lootlogCharactersConfig, isPending: isLootlogConfigLoading } =
    useUserLootlogConfigControllerGetUserLootlogConfigByAccountId(
      { accountId },
      {
        query: {
          queryKey,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          staleTime: 60_000,
        },
      },
    );
  const {
    mutate: updateLootlogCharacterConfig,
    isPending: isUpdatingLootlogConfig,
  } = useUpdateLootlogCharactersConfig();
  const { control, reset, setValue, subscribe } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      catchingGuildIds: [],
    },
  });
  const configByCharacterId = lootlogCharactersConfig?.[characterId];
  const isInitializedRef = useRef(false);
  const isResettingRef = useRef(false);
  const selectedGuildIds =
    useWatch({ control, name: "catchingGuildIds" }) ?? [];

  useEffect(() => {
    const nextCatchingGuildIds = configByCharacterId?.catchingGuildIds ?? [];

    isResettingRef.current = true;
    reset({
      catchingGuildIds: nextCatchingGuildIds,
    });
    const initializationTimeoutId = setTimeout(() => {
      isResettingRef.current = false;
      isInitializedRef.current = true;
    }, 0);

    return () => clearTimeout(initializationTimeoutId);
  }, [
    guilds,
    lootlogCharactersConfig,
    reset,
    characterId,
    configByCharacterId,
  ]);

  useEffect(() => {
    let debounceTimerId: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        if (!isInitializedRef.current || isResettingRef.current) return;

        if (debounceTimerId) {
          clearTimeout(debounceTimerId);
        }

        debounceTimerId = setTimeout(() => {
          const catchingGuildIds = (values.catchingGuildIds ?? []).filter(
            (id): id is string => typeof id === "string",
          );

          updateLootlogCharacterConfig({
            characterId,
            catchingGuildIds,
          });
        }, 500);
      },
    });

    return () => {
      unsubscribe();
      if (debounceTimerId) {
        clearTimeout(debounceTimerId);
      }
    };
  }, [characterId, subscribe, updateLootlogCharacterConfig]);

  const isPending = isLootlogConfigLoading || isUpdatingLootlogConfig;
  const isInteractionDisabled = isPending || disabled;
  const totalGuilds = guilds?.length ?? 0;
  const selectedCount = selectedGuildIds.length;

  const handleGuildToggle = (guildId: string) => {
    const isSelected = selectedGuildIds.includes(guildId);
    const nextSelectedGuildIds = isSelected
      ? selectedGuildIds.filter((id) => id !== guildId)
      : [...selectedGuildIds, guildId];

    onSelectionChange?.(nextSelectedGuildIds);
    setValue("catchingGuildIds", nextSelectedGuildIds, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  return (
    <div className="ll:relative ll:py-1">
      <SettingsSection
        title={t("settings.catching.form.collectionRangeTitle")}
        description={t("settings.catching.form.collectionRangeDescription")}
        actions={
          <div className="ll:flex ll:items-center ll:gap-2">
            <div className="ll:rounded-sm ll:border ll:border-gray-600/80 ll:bg-gray-900/70 ll:px-2 ll:py-1 ll:text-[10px] ll:font-semibold ll:uppercase ll:tracking-[0.08em] ll:text-gray-300">
              {t("settings.catching.form.activeCount", {
                selectedCount,
                totalCount: totalGuilds,
              })}
            </div>
            {isPending ? (
              <Loader2 className="ll:size-4 ll:animate-spin ll:text-primary" />
            ) : null}
          </div>
        }
        contentClassName="ll:gap-3"
      >
        <SettingsGuildSelectionGrid
          guilds={guilds}
          selectedGuildIds={selectedGuildIds}
          disabled={isInteractionDisabled}
          onToggle={handleGuildToggle}
          emptyStateLabel={t("settings.catching.form.emptyGuilds")}
          variant="compact"
        />
      </SettingsSection>
    </div>
  );
};
