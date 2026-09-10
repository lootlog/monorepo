import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import {
  CHAT_NPC_TYPES,
  useHiddenNpcTypes,
} from "@/features/chat/hooks/use-hidden-npc-types";
import { useNpcTypeColors } from "@/hooks/api/use-settings-documents";
import { getTextColor } from "@/utils/notifications-and-detector/background";
import { useTranslation } from "react-i18next";

export const ChatFiltersSettings = () => {
  const { t } = useTranslation(["settings", "common"]);
  const { hiddenNpcTypes, ready, setNpcTypeVisible } = useHiddenNpcTypes();
  const { npcTypeColors } = useNpcTypeColors();

  return (
    <SettingsTabLayout
      title={t("chatFilters.npcMessages.title")}
      description={t("chatFilters.npcMessages.description")}
    >
      <SettingsSection className="ll:gap-1.5">
        <div
          id="chat-npc-message-types"
          data-settings-control="chat-npc-message-types"
          className="ll:flex ll:flex-col ll:gap-1.5"
        >
          {CHAT_NPC_TYPES.map((npcType) => {
            const label = t(`common:npcTypes.${npcType.toLowerCase()}`);
            const controlId = `chat-npc-message-type-${npcType.toLowerCase()}`;

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
                  checked={!hiddenNpcTypes.has(npcType)}
                  disabled={!ready}
                  onCheckedChange={(checked) =>
                    setNpcTypeVisible(npcType, checked)
                  }
                />
              </SettingsControlRow>
            );
          })}
        </div>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
