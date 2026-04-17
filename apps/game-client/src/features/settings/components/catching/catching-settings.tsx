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
  updateLootlogCharactersConfig,
  type LootlogCharacterConfigResponse,
} from "@/api";
import { CharacterTile } from "@/components/character-tile";
import { useLootlogCharactersConfig } from "@/hooks/api/use-lootlog-character-config";
import { useCharacterList } from "@/hooks/api/use-character-list";

import { CatchingSettingsForm } from "@/features/settings/components/catching/catching-settings-form";
import { Game } from "@/lib/game";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const CATCHING_SETTINGS_LOG_PREFIX = "[CatchingSettings]";

export const CatchingSettings = () => {
  const queryClient = useQueryClient();
  const accountId = String(Game.hero.account);
  const {
    data: characterList,
    error: characterListError,
    isError: isCharacterListError,
    isFetching: isCharacterListFetching,
    isPending: isCharacterListPending,
  } = useCharacterList();
  const { data: lootlogCharactersConfig } = useLootlogCharactersConfig();
  const initialCharacterId = String(Game.hero.id);
  const [selectedCharacterId, setSelectedCharacterId] =
    useState(initialCharacterId);
  const [selectionByCharacterId, setSelectionByCharacterId] = useState<
    Record<string, string[]>
  >({});
  const selectionByCharacterIdRef = useRef<Record<string, string[]>>({});
  const { t } = useTranslation();

  useEffect(() => {
    console.log(`${CATCHING_SETTINGS_LOG_PREFIX} Input state updated`, {
      accountId,
      initialCharacterId,
      selectedCharacterId,
      characterListState:
        characterList === undefined
          ? "unavailable"
          : characterList.length === 0
            ? "empty"
            : "populated",
      characterListCount: characterList?.length ?? null,
      characterListSummary:
        characterList?.map((character) => ({
          id: String(character.id),
          world: character.world,
        })) ?? [],
      isCharacterListPending,
      isCharacterListFetching,
      isCharacterListError,
      characterListError:
        characterListError instanceof Error ? characterListError.message : null,
      lootlogConfigCharacterIds: lootlogCharactersConfig
        ? Object.keys(lootlogCharactersConfig)
        : [],
    });
  }, [
    accountId,
    characterList,
    characterListError,
    initialCharacterId,
    isCharacterListError,
    isCharacterListFetching,
    isCharacterListPending,
    lootlogCharactersConfig,
    selectedCharacterId,
  ]);

  useEffect(() => {
    if (!characterList) {
      console.log(
        `${CATCHING_SETTINGS_LOG_PREFIX} Skipping selected character sync because character list is unavailable`,
        {
          accountId,
          selectedCharacterId,
        },
      );
      return;
    }

    if (characterList.length === 0) {
      console.log(
        `${CATCHING_SETTINGS_LOG_PREFIX} Skipping selected character sync because character list is empty`,
        {
          accountId,
          selectedCharacterId,
        },
      );
      return;
    }

    const characterExists = characterList.some(
      (character) => String(character.id) === selectedCharacterId,
    );
    if (characterExists) return;

    const fallbackCharacterId = String(characterList[0].id);

    console.log(
      `${CATCHING_SETTINGS_LOG_PREFIX} Selected character missing from available characters, applying fallback`,
      {
        accountId,
        selectedCharacterId,
        fallbackCharacterId,
        availableCharacterIds: characterList.map((character) =>
          String(character.id),
        ),
      },
    );

    setSelectedCharacterId(fallbackCharacterId);
  }, [accountId, characterList, selectedCharacterId]);

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
          await updateLootlogCharactersConfig(accountId, {
            characterId,
            catchingGuildIds,
          });

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
      await queryClient.cancelQueries({
        queryKey: ["lootlog-characters-config", accountId],
      });

      const previousSelectionByCharacterId = {
        ...selectionByCharacterIdRef.current,
      };
      const previousData =
        queryClient.getQueryData<LootlogCharacterConfigResponse>([
          "lootlog-characters-config",
          accountId,
        ]);

      const fallbackConfig = previousData
        ? Object.values(previousData)[0]
        : undefined;

      queryClient.setQueryData<LootlogCharacterConfigResponse>(
        ["lootlog-characters-config", accountId],
        (currentData) => {
          const nextData = { ...(currentData ?? {}) };

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

      setSelectionByCharacterId((currentSelections) => {
        const nextSelections = { ...currentSelections };

        targetCharacterIds.forEach((characterId) => {
          nextSelections[characterId] = catchingGuildIds;
        });

        selectionByCharacterIdRef.current = nextSelections;
        return nextSelections;
      });

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
        queryClient.setQueryData(
          ["lootlog-characters-config", accountId],
          context.previousData,
        );
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
        queryClient.setQueryData(
          ["lootlog-characters-config", accountId],
          context.previousData,
        );
      }

      if (context?.previousSelectionByCharacterId) {
        selectionByCharacterIdRef.current =
          context.previousSelectionByCharacterId;
        setSelectionByCharacterId(context.previousSelectionByCharacterId);
      }

      toast.error(t("settings.catching.applyFailed"));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["lootlog-characters-config", accountId],
      });
    },
  });

  const handleApplyToAllCharacters = () => {
    if (!characterList) {
      console.log(
        `${CATCHING_SETTINGS_LOG_PREFIX} Skipping apply-to-all because character list is unavailable`,
        {
          accountId,
          selectedCharacterId,
        },
      );
      return;
    }

    if (characterList.length <= 1) {
      console.log(
        `${CATCHING_SETTINGS_LOG_PREFIX} Skipping apply-to-all because there are not enough characters`,
        {
          accountId,
          selectedCharacterId,
          characterCount: characterList.length,
        },
      );
      return;
    }

    const targetCharacterIds = characterList.map((character) =>
      String(character.id),
    );
    const activeCharacterSelection =
      selectionByCharacterIdRef.current[selectedCharacterId] ??
      selectionByCharacterId[selectedCharacterId] ??
      lootlogCharactersConfig?.[selectedCharacterId]?.catchingGuildIds ??
      [];

    console.log(
      `${CATCHING_SETTINGS_LOG_PREFIX} Applying config to all characters`,
      {
        accountId,
        selectedCharacterId,
        activeSelectionCount: activeCharacterSelection.length,
        targetCharacterCount: targetCharacterIds.length,
        targetCharacterIds,
      },
    );

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
