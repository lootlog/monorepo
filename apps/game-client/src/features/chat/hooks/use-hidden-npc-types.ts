import {
  getHiddenNpcTypesFromSettingsDocuments,
  updateHiddenNpcTypesInSettingsDocuments,
  useChatSettingsDocuments,
} from "@/hooks/api/use-settings-documents";
import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  settingsDocumentsControllerPatchPreferences,
  type SettingsDocumentsResponseDtoOutput,
} from "@lootlog/client/main";
import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

/** NPC ranks that produce chat messages and can be filtered out. */
export const CHAT_NPC_TYPES = [
  NpcTypeEnum.ELITE2,
  NpcTypeEnum.HERO,
  NpcTypeEnum.COLOSSUS,
  NpcTypeEnum.TITAN,
] as const;

export type ChatNpcType = (typeof CHAT_NPC_TYPES)[number];

const CHAT_NPC_TYPE_SET: ReadonlySet<string> = new Set(CHAT_NPC_TYPES);

export const isChatNpcType = (value: unknown): value is ChatNpcType =>
  typeof value === "string" && CHAT_NPC_TYPE_SET.has(value);

const initialQueue = Promise.resolve();

/**
 * Owns reads and optimistic writes of the user's hidden chat NPC ranks.
 * Writes are serialized; a failed write refetches and reports once.
 */
export const useHiddenNpcTypes = () => {
  const { t } = useTranslation("settings");
  const preferences = useUserPreferences();
  const settingsDocuments = useChatSettingsDocuments();
  const queryClient = useQueryClient();
  const queue = useRef(initialQueue);
  const generation = useRef(0);
  const hidden = new Set<NpcTypeEnum>(settingsDocuments.hiddenNpcTypes);
  const queryKey = getSettingsDocumentsControllerGetPreferencesQueryKey(
    settingsDocuments.params,
  );
  const ready = Boolean(settingsDocuments.data && preferences.data);

  const setNpcTypeVisible = (npcType: NpcTypeEnum, isVisible: boolean) => {
    const userId = preferences.data?.userId;
    if (!userId || !settingsDocuments.data) return;

    const next = CHAT_NPC_TYPES.filter((type) =>
      type === npcType ? !isVisible : hidden.has(type),
    );
    queryClient.setQueryData<SettingsDocumentsResponseDtoOutput>(
      queryKey,
      (current) => updateHiddenNpcTypesInSettingsDocuments(current, next),
    );

    const currentGeneration = generation.current;
    queue.current = queue.current.then(async () => {
      if (currentGeneration !== generation.current) return;
      try {
        const response = await settingsDocumentsControllerPatchPreferences({
          operations: [
            {
              domain: "chat",
              scope: { type: "USER", id: userId },
              set: { hiddenNpcTypes: next },
              unset: [],
            },
          ],
        });
        const confirmed = getHiddenNpcTypesFromSettingsDocuments(response);
        queryClient.setQueryData<SettingsDocumentsResponseDtoOutput>(
          queryKey,
          (current) =>
            updateHiddenNpcTypesInSettingsDocuments(current, confirmed),
        );
      } catch {
        generation.current += 1;
        await settingsDocuments.refetch();
        toast.error(t("chatFilters.saveError"));
      }
    });
  };

  return { hiddenNpcTypes: hidden, ready, setNpcTypeVisible };
};
