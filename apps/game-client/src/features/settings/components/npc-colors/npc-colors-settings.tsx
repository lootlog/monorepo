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
      title={t("settings.npcColors.title")}
      description={t("settings.npcColors.description")}
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
          <RotateCcw className="ll:size-3" />
          {t("settings.npcColors.resetAll")}
        </Button>
      }
    >
      <div
        id="npc-type-colors"
        className="ll:grid ll:grid-cols-1 ll:gap-1.5 min-[680px]:ll:grid-cols-2"
      >
        {COMBAT_NPC_TYPES.map((npcType) => {
          const surfaceColors = deriveNpcSurfaceColors(draft[npcType]);

          const isModified =
            draft[npcType] !== DEFAULT_NPC_TYPE_COLORS[npcType];

          const npcTypeLabel = t(`common:npcTypes.${npcType.toLowerCase()}`);

          return (
            <NpcColorEditorPopover
              key={npcType}
              color={draft[npcType]}
              defaultColor={DEFAULT_NPC_TYPE_COLORS[npcType]}
              npcType={npcType}
              open={openType === npcType}
              saving={saving && openType === npcType}
              onOpenChange={(open) => setOpenType(open ? npcType : null)}
              onDraftChange={(color) => updateDraft(npcType, color)}
              onCommit={(color) => {
                const normalizedColor = updateDraft(npcType, color);
                commit({ [npcType]: normalizedColor });
              }}
              onReset={() => resetType(npcType)}
            >
              <button
                type="button"
                className="ll:flex ll:h-9 ll:min-w-0 ll:items-center ll:gap-2 ll:rounded-sm ll:border ll:border-solid ll:border-gray-500/40 ll:bg-gray-900/50 ll:px-2 ll:text-left ll:text-xs ll:text-white ll:outline-none focus-visible:ll:ring-1 focus-visible:ll:ring-purple-400 ll-custom-cursor-pointer"
                style={{
                  borderColor:
                    openType === npcType ? surfaceColors.border : undefined,
                  backgroundColor:
                    openType === npcType ? surfaceColors.background : undefined,
                }}
                aria-label={`${t("settings.npcColors.editColor")}: ${npcTypeLabel}`}
              >
                <span
                  className="ll:size-4 ll:shrink-0 ll:rounded-sm ll:border ll:border-solid"
                  style={{
                    backgroundColor: draft[npcType],
                    borderColor: draft[npcType],
                  }}
                />
                <span className="ll:min-w-0 ll:flex-1 ll:truncate">
                  {npcTypeLabel}
                </span>
                {isModified ? (
                  <span
                    className="ll:size-1.5 ll:shrink-0 ll:rounded-full ll:bg-purple-400"
                    title={t("settings.npcColors.modified")}
                  />
                ) : null}
              </button>
            </NpcColorEditorPopover>
          );
        })}
      </div>
    </SettingsTabLayout>
  );
};
