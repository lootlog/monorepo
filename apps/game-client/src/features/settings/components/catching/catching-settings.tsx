import { Button } from "@/components/ui/button";
import {
  SETTINGS_SUBTABS_LIST_CLASS_NAME,
  SETTINGS_SUBTAB_CONTENT_CLASS_NAME,
  SETTINGS_SUBTAB_TRIGGER_CLASS_NAME,
} from "@/components/settings/settings-styles";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  useUserLootlogConfigControllerGetUserLootlogConfigByAccountId,
  userLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig,
} from "@lootlog/api-client/react-query/main/user-lootlog-config";
import { CharacterTile } from "@/components/character-tile";
import { useCharacterList } from "@/hooks/api/use-character-list";

import { CatchingSettingsForm } from "@/features/settings/components/catching/catching-settings-form";
import { useGameStore } from "@/store/game.store";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { UserLootlogConfigAccountResponseDtoOutput } from "@lootlog/api-client/models/main/user-lootlog-config-account-response-dto-output";

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
  const [selectedCharacterId, setSelectedCharacterId] =
    useState(initialCharacterId);
  const [selectionByCharacterId, setSelectionByCharacterId] = useState<
    Record<string, string[]>
  >({});
  const selectionByCharacterIdRef = useRef<Record<string, string[]>>({});
  const { t } = useTranslation();

  useEffect(() => {
    if (!characterList || characterList.length === 0) return;

    const characterExists = characterList.some(
      (character) => String(character.id) === selectedCharacterId,
    );
    if (characterExists) return;

    setSelectedCharacterId(String(characterList[0].id));
  }, [characterList, selectedCharacterId]);

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
      setSelectionByCharacterId(nextSelections);

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
        toast.success(t("settings.catching.applySuccess"));
        return;
      }

      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      if (context?.previousSelectionByCharacterId) {
        selectionByCharacterIdRef.current =
          context.previousSelectionByCharacterId;
        setSelectionByCharacterId(context.previousSelectionByCharacterId);
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
        setSelectionByCharacterId(context.previousSelectionByCharacterId);
      }

      toast.error(t("settings.catching.applyFailed"));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleApplyToAllCharacters = () => {
    if (!characterList || characterList.length <= 1) return;

    const targetCharacterIds = characterList.map((character) =>
      String(character.id),
    );
    const activeCharacterSelection =
      selectionByCharacterIdRef.current[selectedCharacterId] ??
      selectionByCharacterId[selectedCharacterId] ??
      lootlogCharactersConfig?.[selectedCharacterId]?.catchingGuildIds ??
      [];

    applyToAllMutation.mutate({
      catchingGuildIds: activeCharacterSelection,
      targetCharacterIds,
    });
  };

  return (
    <SettingsTabLayout
      title={t("settings.catching.title")}
      description={t("settings.catching.description")}
    >
      <SettingsSection
        title={t("settings.catching.characterTitle")}
        description={t("settings.catching.characterDescription")}
      >
        <Tabs
          value={selectedCharacterId}
          onValueChange={setSelectedCharacterId}
          className="ll:w-full ll:gap-3"
        >
          <TabsList className={SETTINGS_SUBTABS_LIST_CLASS_NAME}>
            {characterList?.map((character) => (
              <TabsTrigger
                key={character.id}
                value={`${character.id}`}
                className={SETTINGS_SUBTAB_TRIGGER_CLASS_NAME}
              >
                <CharacterTile character={character} />
              </TabsTrigger>
            ))}
          </TabsList>
          {characterList && characterList.length > 1 ? (
            <div className="ll:flex ll:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={handleApplyToAllCharacters}
                disabled={applyToAllMutation.isPending}
                className="ll:mt-0 ll:h-7 ll:min-w-44 ll:gap-2 ll:px-3 ll:text-[11px] ll:font-semibold"
              >
                {applyToAllMutation.isPending ? (
                  <Loader2 className="ll:size-3.5 ll:animate-spin" />
                ) : null}
                {t("settings.catching.applyToAllButton")}
              </Button>
            </div>
          ) : null}
          {characterList?.map((character) => (
            <TabsContent
              key={character.id}
              value={`${character.id}`}
              className={SETTINGS_SUBTAB_CONTENT_CLASS_NAME}
            >
              <CatchingSettingsForm
                characterId={character.id.toString()}
                disabled={applyToAllMutation.isPending}
                onSelectionChange={(catchingGuildIds) => {
                  selectionByCharacterIdRef.current = {
                    ...selectionByCharacterIdRef.current,
                    [String(character.id)]: catchingGuildIds,
                  };
                  setSelectionByCharacterId((currentSelections) => ({
                    ...currentSelections,
                    [String(character.id)]: catchingGuildIds,
                  }));
                }}
              />
            </TabsContent>
          ))}
        </Tabs>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
