import {
  getChatAppearanceFromSettingsDocuments,
  getNpcTypeColorsFromSettingsDocuments,
  updateChatAppearanceInSettingsDocuments,
  useAppearanceSettingsDocuments,
} from "@/hooks/api/use-settings-documents";
import {
  type SettingsDocumentsResponseDtoOutput,
  type UserPreferencesResponseDtoOutput,
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  settingsDocumentsControllerPatchPreferences,
  getUsersControllerGetUserPreferencesQueryKey,
} from "@lootlog/client/main";
import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  CHAT_APPEARANCE_COMPACT_PRESET,
  type ChatAppearanceSettings,
} from "@lootlog/schema/chat-appearance";

const initialQueue = Promise.resolve();

export function useChatAppearanceDraft() {
  const { t } = useTranslation();
  const preferences = useUserPreferences();
  const settingsDocuments = useAppearanceSettingsDocuments();
  const npcTypeColors = getNpcTypeColorsFromSettingsDocuments(
    settingsDocuments.data,
  );
  const queryClient = useQueryClient();
  const serverDraft = getChatAppearanceFromSettingsDocuments(
    settingsDocuments.data,
  );
  const [draftState, setDraftState] = useState({
    source: settingsDocuments.data,
    value: serverDraft,
  });
  const draft =
    draftState.source === settingsDocuments.data
      ? draftState.value
      : serverDraft;
  const setDraft = (nextDraft: ChatAppearanceSettings) => {
    setDraftState({ source: settingsDocuments.data, value: nextDraft });
  };
  const mutationQueue = useRef(initialQueue);
  const queueFailed = useRef(false);
  const queueGeneration = useRef(0);
  const pendingMutations = useRef(0);
  const latestDraft = useRef<ChatAppearanceSettings>(
    CHAT_APPEARANCE_READABLE_PRESET,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settingsDocuments.data) return;

    latestDraft.current = getChatAppearanceFromSettingsDocuments(
      settingsDocuments.data,
    );
    queueFailed.current = false;
  }, [settingsDocuments.data]);

  const userId = preferences.data?.userId;

  const updateDraft = (patch: Partial<ChatAppearanceSettings>) => {
    const nextDraft = { ...latestDraft.current, ...patch };
    latestDraft.current = nextDraft;
    setDraft(nextDraft);
  };

  const updateOptimisticCaches = (nextAppearance: ChatAppearanceSettings) => {
    queryClient.setQueryData<UserPreferencesResponseDtoOutput>(
      getUsersControllerGetUserPreferencesQueryKey(),
      (currentPreferences) =>
        currentPreferences
          ? {
              ...currentPreferences,
              chatAppearance: nextAppearance,
            }
          : currentPreferences,
    );
    queryClient.setQueryData<SettingsDocumentsResponseDtoOutput>(
      getSettingsDocumentsControllerGetPreferencesQueryKey(
        settingsDocuments.params,
      ),
      (currentSettingsDocuments) =>
        updateChatAppearanceInSettingsDocuments(
          currentSettingsDocuments,
          nextAppearance,
        ),
    );
  };

  const commit = (patch: Partial<ChatAppearanceSettings>) => {
    if (queueFailed.current || !userId) return;

    const optimisticAppearance = latestDraft.current;
    updateOptimisticCaches(optimisticAppearance);
    pendingMutations.current += 1;
    setSaving(true);
    const mutationGeneration = queueGeneration.current;

    mutationQueue.current = mutationQueue.current
      .then(async () => {
        if (
          queueFailed.current ||
          mutationGeneration !== queueGeneration.current
        ) {
          return;
        }

        try {
          const updatedSettingsDocuments =
            await settingsDocumentsControllerPatchPreferences({
              operations: [
                {
                  domain: "appearance",
                  scope: { type: "USER", id: userId },
                  set: { chat: patch },
                  unset: [],
                },
              ],
            });
          const hasQueuedMutation = pendingMutations.current > 1;
          const nextSettingsDocuments = hasQueuedMutation
            ? updateChatAppearanceInSettingsDocuments(
                updatedSettingsDocuments,
                latestDraft.current,
              )
            : updatedSettingsDocuments;
          const nextAppearance = hasQueuedMutation
            ? latestDraft.current
            : getChatAppearanceFromSettingsDocuments(updatedSettingsDocuments);

          queryClient.setQueryData<SettingsDocumentsResponseDtoOutput>(
            getSettingsDocumentsControllerGetPreferencesQueryKey(
              settingsDocuments.params,
            ),
            nextSettingsDocuments,
          );
          queryClient.setQueryData<UserPreferencesResponseDtoOutput>(
            getUsersControllerGetUserPreferencesQueryKey(),
            (currentPreferences) =>
              currentPreferences
                ? {
                    ...currentPreferences,
                    chatAppearance: nextAppearance,
                  }
                : currentPreferences,
          );
        } catch {
          queueFailed.current = true;
          queueGeneration.current += 1;
          const [, settingsRefetchResult] = await Promise.all([
            preferences.refetch(),
            settingsDocuments.refetch(),
          ]);
          const serverAppearance = getChatAppearanceFromSettingsDocuments(
            settingsRefetchResult.data,
          );
          latestDraft.current = serverAppearance;
          setDraft(serverAppearance);
          toast.error(t("settings.chat.save.error"));
        }
      })
      .finally(() => {
        pendingMutations.current -= 1;
        if (pendingMutations.current === 0) {
          setSaving(false);
        }
      });
  };

  const updateAndCommit = (patch: Partial<ChatAppearanceSettings>) => {
    updateDraft(patch);
    commit(patch);
  };

  const applyPreset = (preset: "readable" | "compact") => {
    const nextSettings =
      preset === "readable"
        ? CHAT_APPEARANCE_READABLE_PRESET
        : CHAT_APPEARANCE_COMPACT_PRESET;
    updateDraft(nextSettings);
    commit(nextSettings);
  };

  return {
    draft,
    saving,
    npcTypeColors,
    updateDraft,
    commit,
    updateAndCommit,
    applyPreset,
  };
}
