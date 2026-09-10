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

/**
 * One write queue for every consumer (settings panel, context menu).
 * The game client serves a single signed-in user, so the queue is global.
 */
let writeQueue = Promise.resolve();
let writeGeneration = 0;
let pendingWrites = 0;

/**
 * Owns reads and optimistic writes of the user's hidden chat NPC ranks.
 * Each write derives its patch from the live query cache, writes are
 * serialized across consumers, and a failed write refetches and reports once.
 */
export const useHiddenNpcTypes = () => {
  const { t } = useTranslation("settings");
  const preferences = useUserPreferences();
  const settingsDocuments = useChatSettingsDocuments();
  const queryClient = useQueryClient();
  const hidden = new Set<NpcTypeEnum>(settingsDocuments.hiddenNpcTypes);
  const queryKey = getSettingsDocumentsControllerGetPreferencesQueryKey(
    settingsDocuments.params,
  );
  const ready = Boolean(settingsDocuments.data && preferences.data);

  const setNpcTypeVisible = (npcType: NpcTypeEnum, isVisible: boolean) => {
    const userId = preferences.data?.userId;
    if (!userId || !settingsDocuments.data) return;

    const cached = new Set(
      getHiddenNpcTypesFromSettingsDocuments(
        queryClient.getQueryData<SettingsDocumentsResponseDtoOutput>(queryKey),
      ),
    );
    const next = CHAT_NPC_TYPES.filter((type) =>
      type === npcType ? !isVisible : cached.has(type),
    );
    queryClient.setQueryData<SettingsDocumentsResponseDtoOutput>(
      queryKey,
      (current) => updateHiddenNpcTypesInSettingsDocuments(current, next),
    );

    const generation = writeGeneration;
    pendingWrites += 1;
    writeQueue = writeQueue.then(async () => {
      try {
        if (generation !== writeGeneration) return;
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
        // A later optimistic write already superseded this response.
        if (pendingWrites > 1) return;
        const confirmed = getHiddenNpcTypesFromSettingsDocuments(response);
        queryClient.setQueryData<SettingsDocumentsResponseDtoOutput>(
          queryKey,
          (current) =>
            updateHiddenNpcTypesInSettingsDocuments(current, confirmed),
        );
      } catch {
        writeGeneration += 1;
        await settingsDocuments.refetch();
        toast.error(t("chatFilters.saveError"));
      } finally {
        pendingWrites -= 1;
      }
    });
  };

  return { hiddenNpcTypes: hidden, ready, setNpcTypeVisible };
};
