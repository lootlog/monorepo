import { NpcTypeChip } from "@/components/settings/npc-type-chip";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import {
  CHAT_NPC_TYPES,
  useHiddenNpcTypes,
} from "@/features/chat/hooks/use-hidden-npc-types";
import { useTranslation } from "react-i18next";

export const ChatFiltersSettings = () => {
  const { t } = useTranslation();
  const { hiddenNpcTypes, ready, setNpcTypeVisible } = useHiddenNpcTypes();

  return (
    <SettingsTabLayout>
      <SettingsSection
        controlId="chat-npc-message-types"
        title={t("settings.chatFilters.npcMessages.title")}
        description={t("settings.chatFilters.npcMessages.description")}
      >
        {CHAT_NPC_TYPES.map((npcType) => {
          const label = t(`common:npcTypes.${npcType.toLowerCase()}`);
          const controlId = `chat-npc-message-type-${npcType.toLowerCase()}`;

          return (
            <SettingsRow
              key={npcType}
              htmlFor={controlId}
              className="ll:py-2"
              labelClassName="ll:font-semibold"
              label={<NpcTypeChip npcType={npcType}>{label}</NpcTypeChip>}
            >
              <Switch
                id={controlId}
                checked={!hiddenNpcTypes.has(npcType)}
                disabled={!ready}
                onCheckedChange={(checked) =>
                  setNpcTypeVisible(npcType, checked)
                }
              />
            </SettingsRow>
          );
        })}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
