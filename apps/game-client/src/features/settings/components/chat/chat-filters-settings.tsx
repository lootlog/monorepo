import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import {
  getHiddenNpcTypesFromSettingsDocuments,
  updateHiddenNpcTypesInSettingsDocuments,
  useChatSettingsDocuments,
  useNpcTypeColors,
} from "@/hooks/api/use-settings-documents";
import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import { getTextColor } from "@/utils/notifications-and-detector/background";
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

const CHAT_NPC_TYPES = [
  NpcTypeEnum.ELITE2,
  NpcTypeEnum.HERO,
  NpcTypeEnum.COLOSSUS,
  NpcTypeEnum.TITAN,
] as const;

const initialQueue = Promise.resolve();

export const ChatFiltersSettings = () => {
  const { t } = useTranslation(["settings", "common"]);
  const preferences = useUserPreferences();
  const settingsDocuments = useChatSettingsDocuments();
  const { npcTypeColors } = useNpcTypeColors();
  const queryClient = useQueryClient();
  const queue = useRef(initialQueue);
  const generation = useRef(0);
  const hidden = new Set(settingsDocuments.hiddenNpcTypes);
  const queryKey = getSettingsDocumentsControllerGetPreferencesQueryKey(
    settingsDocuments.params,
  );

  const setHidden = (npcType: NpcTypeEnum, isHidden: boolean) => {
    const userId = preferences.data?.userId;
    if (!userId || !settingsDocuments.data) return;

    const next = CHAT_NPC_TYPES.filter((type) =>
      type === npcType ? isHidden : hidden.has(type),
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

  return (
    <SettingsTabLayout
      title={t("chatFilters.hiddenNpcTypes.title")}
      description={t("chatFilters.hiddenNpcTypes.description")}
    >
      <SettingsSection className="ll:gap-1.5">
        <div
          id="chat-hidden-npc-types"
          data-settings-control="chat-hidden-npc-types"
          className="ll:flex ll:flex-col ll:gap-1.5"
        >
          {CHAT_NPC_TYPES.map((npcType) => {
            const label = t(`common:npcTypes.${npcType.toLowerCase()}`);
            const controlId = `chat-hidden-npc-type-${npcType.toLowerCase()}`;
            return (
              <SettingsControlRow
                key={npcType}
                label={<label htmlFor={controlId}>{label}</label>}
                labelStyle={{
                  color: getTextColor(npcType, true, npcTypeColors),
                }}
              >
                <Switch
                  id={controlId}
                  checked={hidden.has(npcType)}
                  disabled={!settingsDocuments.data || !preferences.data}
                  onCheckedChange={(checked) => setHidden(npcType, checked)}
                />
              </SettingsControlRow>
            );
          })}
        </div>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
