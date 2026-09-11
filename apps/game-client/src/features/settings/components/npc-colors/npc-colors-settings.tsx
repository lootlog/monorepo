import { SettingsColorRow } from "@/components/settings/settings-color-row";
import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Button } from "@/components/ui/button";
import { enqueueSettingsPatch } from "@/features/settings/persistence/settings-patch-client";
import { useSettingsSaveStatus } from "@/features/settings/persistence/settings-save-status.store";
import { useNpcTypeColors } from "@/features/settings/persistence/use-appearance-settings";
import {
  COMBAT_NPC_TYPES,
  DEFAULT_NPC_TYPE_COLORS,
  type CombatNpcType,
  type NpcTypeColors,
} from "@lootlog/schema/npc-appearance";
import {
  deriveNpcSurfaceColors,
  normalizeAppearanceColor,
} from "@lootlog/domain/npc-appearance";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NpcColorEditorPopover } from "./npc-color-editor-popover";

export const NpcColorsSettings = () => {
  const { t } = useTranslation();
  const { npcTypeColors, data } = useNpcTypeColors();
  const status = useSettingsSaveStatus();

  const [draftState, setDraftState] = useState<{
    source: typeof data;
    value: NpcTypeColors;
  }>({ source: data, value: npcTypeColors });

  const draft = draftState.source === data ? draftState.value : npcTypeColors;
  const [openType, setOpenType] = useState<CombatNpcType | null>(null);
  const saving = status === "saving";

  const setDraft = (patch: Partial<NpcTypeColors>) =>
    setDraftState({ source: data, value: { ...draft, ...patch } });

  const commit = (patch: Partial<NpcTypeColors>, unset: string[] = []) =>
    enqueueSettingsPatch({
      domain: "appearance",
      set: Object.keys(patch).length > 0 ? { npcColors: patch } : {},
      unset,
    });

  const updateDraft = (npcType: CombatNpcType, value: string) => {
    const color = normalizeAppearanceColor(
      value,
      DEFAULT_NPC_TYPE_COLORS[npcType],
    );

    setDraft({ [npcType]: color });

    return color;
  };

  const resetType = (npcType: CombatNpcType) => {
    const defaultColor = DEFAULT_NPC_TYPE_COLORS[npcType];
    setDraft({ [npcType]: defaultColor });
    commit({}, [`npcColors.${npcType}`]);
  };

  return (
    <SettingsTabLayout
      actions={
        <Button
          type="button"
          variant="ghost"
          className="ll:gap-2 ll:px-2"
          onClick={() => {
            setDraft(DEFAULT_NPC_TYPE_COLORS);
            commit(
              {},
              COMBAT_NPC_TYPES.map((npcType) => `npcColors.${npcType}`),
            );
          }}
        >
          <RotateCcw className="ll:size-3.5" />
          {t("settings.npcColors.resetAll")}
        </Button>
      }
    >
      <SettingsSection
        controlId="npc-type-colors"
        title={t("settings.npcColors.title")}
        description={t("settings.npcColors.description")}
      >
        {COMBAT_NPC_TYPES.map((npcType) => {
          const color = draft[npcType];
          const surfaceColors = deriveNpcSurfaceColors(color);
          const isModified = color !== DEFAULT_NPC_TYPE_COLORS[npcType];
          const npcTypeLabel = t(`common:npcTypes.${npcType.toLowerCase()}`);

          return (
            <SettingsColorRow
              key={npcType}
              name={npcTypeLabel}
              borderColor={color}
              backgroundColor={surfaceColors.background}
              modified={isModified}
              modifiedLabel={t("settings.npcColors.modified")}
              editLabel={`${t("settings.npcColors.editColor")}: ${npcTypeLabel}`}
              editTrigger={(trigger) => (
                <NpcColorEditorPopover
                  color={color}
                  defaultColor={DEFAULT_NPC_TYPE_COLORS[npcType]}
                  npcType={npcType}
                  open={openType === npcType}
                  saving={saving && openType === npcType}
                  onOpenChange={(open) => setOpenType(open ? npcType : null)}
                  onDraftChange={(nextColor) => updateDraft(npcType, nextColor)}
                  onCommit={(nextColor) => {
                    const normalizedColor = updateDraft(npcType, nextColor);
                    commit({ [npcType]: normalizedColor });
                  }}
                  onReset={() => resetType(npcType)}
                >
                  {trigger}
                </NpcColorEditorPopover>
              )}
            >
              {isModified ? (
                <SettingsIconButton
                  label={`${t("settings.npcColors.reset")}: ${npcTypeLabel}`}
                  onClick={() => resetType(npcType)}
                >
                  <RotateCcw />
                </SettingsIconButton>
              ) : null}
            </SettingsColorRow>
          );
        })}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
