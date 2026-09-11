import { SettingsSectionHeader } from "@/components/settings/settings-section-header";
import { SettingsGuildPicker } from "@/features/settings/components/shared/settings-guild-picker";
import { type FC, type ReactNode, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
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
  /** Trailing actions of the servers group, e.g. "apply to all characters". */
  actions?: ReactNode;
  onSelectionChange?: (catchingGuildIds: string[]) => void;
};

const FormSchema = z.object({
  catchingGuildIds: z.array(z.string()),
});

type FormData = z.infer<typeof FormSchema>;

export const CatchingSettingsForm: FC<CatchingSettingsFormProps> = ({
  characterId,
  disabled = false,
  actions,
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
    <div className="ll:flex ll:flex-col ll:gap-1">
      <SettingsSectionHeader
        as="h4"
        title={t("settings.catching.form.serversTitle")}
        description={t("settings.catching.form.activeCount", {
          selectedCount,
          totalCount: totalGuilds,
        })}
        actions={actions}
      />
      <SettingsGuildPicker
        aria-label={t("settings.catching.form.serversTitle")}
        guilds={guilds}
        selectedGuildIds={selectedGuildIds}
        disabled={isInteractionDisabled}
        onToggle={handleGuildToggle}
        emptyStateLabel={t("settings.catching.form.emptyGuilds")}
      />
    </div>
  );
};
