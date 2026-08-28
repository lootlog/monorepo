import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Button } from "@/components/ui/button";
import {
  getNpcTypeColorsFromSettingsDocuments,
  updateNpcTypeColorsInSettingsDocuments,
  useAppearanceSettingsDocuments,
} from "@/hooks/api/use-settings-documents";
import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import {
  COMBAT_NPC_TYPES,
  DEFAULT_NPC_TYPE_COLORS,
  deriveNpcSurfaceColors,
  normalizeAppearanceColor,
  type CombatNpcType,
  type NpcTypeColors,
} from "@lootlog/types";
import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  settingsDocumentsControllerPatchPreferences,
} from "@lootlog/api-client/react-query/main/preferences";
import type { SettingsDocumentsResponseDtoOutput } from "@lootlog/api-client/models/main/settings-documents-response-dto-output";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { NpcColorEditorPopover } from "./npc-color-editor-popover";

export const NpcColorsSettings = () => {
  const { t } = useTranslation();
  const preferences = useUserPreferences();
  const settingsDocuments = useAppearanceSettingsDocuments();
  const queryClient = useQueryClient();
  const serverDraft = getNpcTypeColorsFromSettingsDocuments(
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
  const [openType, setOpenType] = useState<CombatNpcType | null>(null);
  const [saving, setSaving] = useState(false);
  const queue = useRef(Promise.resolve());
  const generation = useRef(0);

  const updateCache = (patch: Partial<NpcTypeColors>) => {
    queryClient.setQueryData<SettingsDocumentsResponseDtoOutput>(
      getSettingsDocumentsControllerGetPreferencesQueryKey(
        settingsDocuments.params,
      ),
      (current) => updateNpcTypeColorsInSettingsDocuments(current, patch),
    );
  };

  const commit = (patch: Partial<NpcTypeColors>, unset: string[] = []) => {
    const userId = preferences.data?.userId;
    if (!userId) return;

    const currentGeneration = generation.current;
    setSaving(true);
    queue.current = queue.current
      .then(async () => {
        if (currentGeneration !== generation.current) return;
        try {
          const response = await settingsDocumentsControllerPatchPreferences({
            operations: [
              {
                domain: "appearance",
                scope: { type: "USER", id: userId },
                set: Object.keys(patch).length > 0 ? { npcColors: patch } : {},
                unset,
              },
            ],
          });
          const nextColors = getNpcTypeColorsFromSettingsDocuments(response);
          queryClient.setQueryData<SettingsDocumentsResponseDtoOutput>(
            getSettingsDocumentsControllerGetPreferencesQueryKey(
              settingsDocuments.params,
            ),
            (current) =>
              updateNpcTypeColorsInSettingsDocuments(current, nextColors),
          );
          setDraftState({
            source: settingsDocuments.data,
            value: nextColors,
          });
        } catch {
          generation.current += 1;
          await settingsDocuments.refetch();
          toast.error(t("settings.npcColors.saveError"));
        }
      })
      .finally(() => setSaving(false));
  };

  const updateDraft = (npcType: CombatNpcType, value: string) => {
    const color = normalizeAppearanceColor(
      value,
      DEFAULT_NPC_TYPE_COLORS[npcType],
    );
    const patch = { [npcType]: color } as Partial<NpcTypeColors>;
    setDraftState({
      source: settingsDocuments.data,
      value: { ...draft, ...patch },
    });
    updateCache(patch);
    return color;
  };

  const resetType = (npcType: CombatNpcType) => {
    const defaultColor = DEFAULT_NPC_TYPE_COLORS[npcType];
    const patch = { [npcType]: defaultColor };
    setDraftState({
      source: settingsDocuments.data,
      value: { ...draft, ...patch },
    });
    updateCache(patch);
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
            setDraftState({
              source: settingsDocuments.data,
              value: DEFAULT_NPC_TYPE_COLORS,
            });
            updateCache(DEFAULT_NPC_TYPE_COLORS);
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
