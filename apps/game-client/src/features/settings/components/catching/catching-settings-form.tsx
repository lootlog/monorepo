import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsGuildSelectionGrid } from "@/features/settings/components/shared/settings-guild-selection-grid";
import { type FC, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useUpdateLootlogCharactersConfig } from "@/hooks/api/use-update-lootlog-characters-config";
import { useTranslation } from "react-i18next";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@/lib/api/generated/main/users/users";
import {
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  useUserLootlogConfigControllerGetUserLootlogConfigByAccountId,
} from "@/lib/api/generated/main/user-lootlog-config/user-lootlog-config";
import { Game } from "@/lib/game";

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
  const accountId = String(Game.hero.account);
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
          refetchOnMount: true,
          refetchOnWindowFocus: true,
          staleTime: 0,
        },
      },
    );
  const {
    mutate: updateLootlogCharacterConfig,
    isPending: isUpdatingLootlogConfig,
  } = useUpdateLootlogCharactersConfig();
  const { reset, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      catchingGuildIds: [],
    },
  });
  const configByCharacterId = lootlogCharactersConfig?.[characterId];
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const isResettingRef = useRef(false);
  const mutateRef = useRef(updateLootlogCharacterConfig);
  const onSelectionChangeRef = useRef(onSelectionChange);

  mutateRef.current = updateLootlogCharacterConfig;
  onSelectionChangeRef.current = onSelectionChange;
  const selectedGuildIds = watch("catchingGuildIds") ?? [];

  useEffect(() => {
    const nextCatchingGuildIds = configByCharacterId?.catchingGuildIds ?? [];

    isResettingRef.current = true;
    reset({
      catchingGuildIds: nextCatchingGuildIds,
    });
    onSelectionChangeRef.current?.(nextCatchingGuildIds);
    setTimeout(() => {
      isResettingRef.current = false;
      isInitializedRef.current = true;
    }, 0);
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
        const catchingGuildIds = (value.catchingGuildIds ?? []).filter(
          (id): id is string => typeof id === "string",
        );

        mutateRef.current({
          characterId,
          catchingGuildIds,
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
  const isInteractionDisabled = isPending || disabled;
  const totalGuilds = guilds?.length ?? 0;
  const selectedCount = selectedGuildIds.length;

  const handleGuildToggle = (guildId: string) => {
    const isSelected = selectedGuildIds.includes(guildId);
    const nextSelectedGuildIds = isSelected
      ? selectedGuildIds.filter((id) => id !== guildId)
      : [...selectedGuildIds, guildId];

    onSelectionChangeRef.current?.(nextSelectedGuildIds);
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
