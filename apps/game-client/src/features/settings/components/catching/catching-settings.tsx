import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import {
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  useUserLootlogConfigControllerGetUserLootlogConfigByAccountId,
  userLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig,
  type UserLootlogConfigAccountResponseDtoOutput,
} from "@lootlog/client/main";
import { SettingsCharacterPicker } from "@/features/settings/components/shared/settings-character-picker";
import { useSaveMarks } from "@/features/settings/components/shared/use-save-marks";
import { useCharacterList } from "@/hooks/api/use-character-list";

import { CatchingSettingsForm } from "@/features/settings/components/catching/catching-settings-form";
import { reportSettingsSave } from "@/features/settings/persistence/settings-save-status.store";
import { useGameStore } from "@/store/game.store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const CatchingSettings = () => {
  const queryClient = useQueryClient();
  const accountId = useGameStore((state) => state.game?.hero.accountId ?? "");

  const queryKey =
    getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
      accountId,
    });

  const { data: characterList } = useCharacterList();

  const { data: lootlogCharactersConfig } =
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

  const initialCharacterId = useGameStore(
    (state) => state.game?.hero.characterId ?? "",
  );

  const [requestedCharacterId, setRequestedCharacterId] =
    useState(initialCharacterId);

  const { marks: saveMarkByCharacterId, mark: markCharacters } = useSaveMarks();
  const { t } = useTranslation();

  const characters = characterList ?? [];

  const requestedCharacterExists = characters.some(
    (character) => String(character.id) === requestedCharacterId,
  );

  const selectedCharacterId = requestedCharacterExists
    ? requestedCharacterId
    : String(characters[0]?.id ?? "");

  const applyToAllMutation = useMutation({
    mutationKey: ["apply-catching-config-to-all-characters", accountId],
    mutationFn: async ({
      catchingGuildIds,
      targetCharacterIds,
    }: {
      catchingGuildIds: string[];
      targetCharacterIds: string[];
    }) => {
      const results = await Promise.allSettled(
        targetCharacterIds.map(async (characterId) => {
          await userLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig(
            { accountId },
            {
              characterId,
              catchingGuildIds,
            },
          );

          return characterId;
        }),
      );

      const successCount = results.filter(
        (result) => result.status === "fulfilled",
      ).length;

      const failureCount = results.length - successCount;

      return {
        failureCount,
        successCount,
        totalCount: results.length,
      };
    },
    onMutate: async ({ catchingGuildIds, targetCharacterIds }) => {
      reportSettingsSave.saving();
      markCharacters(targetCharacterIds, "saving");
      await queryClient.cancelQueries({ queryKey });

      const previousData =
        queryClient.getQueryData<UserLootlogConfigAccountResponseDtoOutput>(
          queryKey,
        );

      const fallbackConfig = previousData
        ? Object.values(previousData)[0]
        : undefined;

      queryClient.setQueryData<UserLootlogConfigAccountResponseDtoOutput>(
        queryKey,
        (currentData) => {
          const nextData = { ...currentData };

          targetCharacterIds.forEach((characterId) => {
            const currentCharacterConfig = nextData[characterId];

            nextData[characterId] = {
              userId:
                currentCharacterConfig?.userId ?? fallbackConfig?.userId ?? "",
              accountId:
                currentCharacterConfig?.accountId ??
                fallbackConfig?.accountId ??
                accountId,
              characterId,
              catchingGuildIds,
            };
          });

          return nextData;
        },
      );

      return { previousData };
    },
    onSuccess: (
      { failureCount, successCount, totalCount },
      variables,
      context,
    ) => {
      if (failureCount === 0) {
        reportSettingsSave.saved();
        markCharacters(variables.targetCharacterIds, "saved");

        return;
      }

      reportSettingsSave.failed(() => applyToAllMutation.mutate(variables));
      markCharacters(variables.targetCharacterIds, "error");

      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      if (successCount === 0) {
        toast.error(t("settings.catching.applyNoneFailed"));

        return;
      }

      toast.error(
        t("settings.catching.applyPartialFailed", {
          successCount,
          totalCount,
        }),
      );
    },
    onError: (_error, variables, context) => {
      reportSettingsSave.failed(() => applyToAllMutation.mutate(variables));
      markCharacters(variables.targetCharacterIds, "error");

      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      toast.error(t("settings.catching.applyFailed"));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleApplyToAllCharacters = () => {
    if (characters.length <= 1) return;

    const targetCharacterIds = characters.map((character) =>
      String(character.id),
    );

    const activeCharacterSelection =
      lootlogCharactersConfig?.[selectedCharacterId]?.catchingGuildIds ?? [];

    applyToAllMutation.mutate({
      catchingGuildIds: activeCharacterSelection,
      targetCharacterIds,
    });
  };

  return (
    <SettingsTabLayout>
      <SettingsSection
        title={t("settings.catching.characterTitle")}
        description={t("settings.catching.characterDescription")}
      >
        <div className="ll:px-2 ll:py-0.5">
          <SettingsCharacterPicker
            aria-label={t("settings.catching.characterLabel")}
            characters={characters}
            value={selectedCharacterId}
            saveMarkByCharacterId={saveMarkByCharacterId}
            disabled={applyToAllMutation.isPending}
            onValueChange={setRequestedCharacterId}
          />
        </div>
      </SettingsSection>
      {selectedCharacterId ? (
        <CatchingSettingsForm
          key={selectedCharacterId}
          characterId={selectedCharacterId}
          disabled={applyToAllMutation.isPending}
          onSaveStateChange={(status) =>
            markCharacters([selectedCharacterId], status)
          }
          actions={
            characters.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyToAllCharacters}
                loading={applyToAllMutation.isPending}
              >
                {t("settings.catching.applyToAllButton")}
              </Button>
            ) : null
          }
        />
      ) : null}
    </SettingsTabLayout>
  );
};
