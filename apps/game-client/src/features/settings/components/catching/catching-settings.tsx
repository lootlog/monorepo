import { Button } from "@/components/ui/button";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  useUserLootlogConfigControllerGetUserLootlogConfigByAccountId,
  userLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig,
  type UserLootlogConfigAccountResponseDtoOutput,
} from "@lootlog/client/main";
import { CatchingCharacterOption } from "@/features/settings/components/catching/catching-character-option";
import { useCharacterList } from "@/hooks/api/use-character-list";

import { CatchingSettingsForm } from "@/features/settings/components/catching/catching-settings-form";
import { useGameStore } from "@/store/game.store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const CHARACTER_PICKER_ID = "catching-character";

const TOGGLE_GROUP_MAX_OPTIONS = 3;

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

  const selectionByCharacterIdRef = useRef<Record<string, string[]>>({});
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
      await queryClient.cancelQueries({ queryKey });

      const previousSelectionByCharacterId = {
        ...selectionByCharacterIdRef.current,
      };

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

      const nextSelections = { ...selectionByCharacterIdRef.current };
      targetCharacterIds.forEach((characterId) => {
        nextSelections[characterId] = catchingGuildIds;
      });
      selectionByCharacterIdRef.current = nextSelections;

      return {
        previousData,
        previousSelectionByCharacterId,
      };
    },
    onSuccess: (
      { failureCount, successCount, totalCount },
      _variables,
      context,
    ) => {
      if (failureCount === 0) {
        return;
      }

      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      if (context?.previousSelectionByCharacterId) {
        selectionByCharacterIdRef.current =
          context.previousSelectionByCharacterId;
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
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      if (context?.previousSelectionByCharacterId) {
        selectionByCharacterIdRef.current =
          context.previousSelectionByCharacterId;
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
      selectionByCharacterIdRef.current[selectedCharacterId] ??
      lootlogCharactersConfig?.[selectedCharacterId]?.catchingGuildIds ??
      [];

    applyToAllMutation.mutate({
      catchingGuildIds: activeCharacterSelection,
      targetCharacterIds,
    });
  };

  const characterPicker =
    characters.length <= TOGGLE_GROUP_MAX_OPTIONS ? (
      <ToggleGroup
        id={CHARACTER_PICKER_ID}
        variant="outline"
        size="sm"
        spacing={0}
        value={[selectedCharacterId]}
        onValueChange={([value]: string[]) => {
          if (value) setRequestedCharacterId(value);
        }}
      >
        {characters.map((character) => (
          <ToggleGroupItem key={character.id} value={String(character.id)}>
            <CatchingCharacterOption
              icon={character.icon}
              nick={character.nick}
            />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    ) : (
      <Select
        value={selectedCharacterId}
        onValueChange={setRequestedCharacterId}
      >
        <SelectTrigger id={CHARACTER_PICKER_ID}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {characters.map((character) => (
            <SelectItem key={character.id} value={String(character.id)}>
              <CatchingCharacterOption
                icon={character.icon}
                nick={character.nick}
              />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );

  return (
    <SettingsTabLayout>
      <SettingsSection
        title={t("settings.catching.characterTitle")}
        description={t("settings.catching.characterDescription")}
      >
        <SettingsRow
          htmlFor={CHARACTER_PICKER_ID}
          label={t("settings.catching.characterLabel")}
          controlClassName={
            characters.length > TOGGLE_GROUP_MAX_OPTIONS ? "ll:w-44" : undefined
          }
        >
          {characterPicker}
        </SettingsRow>
      </SettingsSection>
      {selectedCharacterId ? (
        <CatchingSettingsForm
          key={selectedCharacterId}
          characterId={selectedCharacterId}
          disabled={applyToAllMutation.isPending}
          onSelectionChange={(catchingGuildIds) => {
            selectionByCharacterIdRef.current = {
              ...selectionByCharacterIdRef.current,
              [selectedCharacterId]: catchingGuildIds,
            };
          }}
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
