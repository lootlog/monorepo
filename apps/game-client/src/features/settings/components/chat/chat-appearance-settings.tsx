import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getChatAppearanceFromSettingsDocuments,
  getNpcTypeColorsFromSettingsDocuments,
  updateChatAppearanceInSettingsDocuments,
  useAppearanceSettingsDocuments,
} from "@/hooks/api/use-settings-documents";
import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import { useSettingsStore } from "@/store/settings.store";
import type { SettingsDocumentsResponseDtoOutput } from "@lootlog/api-client/models/main/settings-documents-response-dto-output";
import type { UserPreferencesResponseDtoOutput } from "@lootlog/api-client/models/main/user-preferences-response-dto-output";
import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  settingsDocumentsControllerPatchPreferences,
} from "@lootlog/api-client/react-query/main/preferences";
import { getUsersControllerGetUserPreferencesQueryKey } from "@lootlog/api-client/react-query/main/users";
import {
  CHAT_APPEARANCE_COMPACT_PRESET,
  CHAT_APPEARANCE_READABLE_PRESET,
  CHAT_FONT_SCALE_MAX_PERCENT,
  CHAT_FONT_SCALE_MIN_PERCENT,
  CHAT_MESSAGE_GAP_MAX_PX,
  CHAT_MESSAGE_GAP_MIN_PX,
  getChatAppearancePreset,
  type ChatAppearanceSettings,
} from "@lootlog/types";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SettingsHelpPopover } from "../shared/settings-help-popover";
import { ChatAppearancePresetCard } from "./chat-appearance-preset-card";

const METADATA_KEYS = [
  "showTimestamp",
  "showGuildLabel",
  "showNpcAvatar",
  "showNpcLevel",
] as const;

export const ChatAppearanceSettingsForm = () => {
  const { t } = useTranslation();
  const allowWorldSelection = useSettingsStore(
    (state) => state.allowWorldSelection ?? false,
  );
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
  const mutationQueue = useRef(Promise.resolve());
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

  const activePreset = getChatAppearancePreset(draft);
  const visibleMetadataKeys = allowWorldSelection
    ? METADATA_KEYS
    : METADATA_KEYS.filter((key) => key !== "showGuildLabel");

  return (
    <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-3">
      <SettingsSection
        title={t("settings.chat.preset.section")}
        actions={
          <Button
            aria-hidden={activePreset !== "custom"}
            className={activePreset === "custom" ? undefined : "ll:invisible"}
            disabled={activePreset !== "custom"}
            onClick={() => applyPreset("readable")}
            tabIndex={activePreset === "custom" ? 0 : -1}
            type="button"
            variant="ghost"
          >
            <RotateCcw className="ll:size-3.5" />
            {t("settings.chat.preset.restoreReadable")}
          </Button>
        }
      >
        <div
          className="ll:grid"
          id="chat-preset"
          style={{
            gap: 8,
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 9rem), 1fr))",
          }}
        >
          <ChatAppearancePresetCard
            description={t("settings.chat.preset.readableDescription")}
            name={t("settings.chat.preset.readable")}
            npcTypeColors={npcTypeColors}
            onSelect={() => applyPreset("readable")}
            selected={activePreset === "readable"}
            settings={CHAT_APPEARANCE_READABLE_PRESET}
          />
          <ChatAppearancePresetCard
            description={t("settings.chat.preset.compactDescription")}
            name={t("settings.chat.preset.compact")}
            npcTypeColors={npcTypeColors}
            onSelect={() => applyPreset("compact")}
            selected={activePreset === "compact"}
            settings={CHAT_APPEARANCE_COMPACT_PRESET}
          />
        </div>
      </SettingsSection>

      <section
        aria-labelledby="chat-advanced-title"
        className="ll:rounded-lg ll:border ll:border-gray-700 ll:bg-gray-950/40"
      >
        <div
          className="ll:px-3 ll:py-2.5 ll:text-xs ll:font-semibold ll:text-gray-200"
          id="chat-advanced-title"
        >
          {t("settings.chat.advanced.title")}
        </div>
        <div className="ll:flex ll:flex-col ll:gap-3 ll:border-t ll:border-gray-800 ll:p-3">
          <SettingsSection title={t("settings.chat.layout.section")}>
            <SettingsControlRow
              id="chat-npc-layout"
              label={
                <span className="ll:inline-flex ll:items-center">
                  {t("settings.chat.npcLayout.label")}
                  <SettingsHelpPopover
                    description={t("settings.chat.npcLayout.description")}
                    recommendation={t("settings.chat.npcLayout.recommendation")}
                    example={t("settings.chat.npcLayout.example")}
                  />
                </span>
              }
              description={t("settings.chat.npcLayout.description")}
              controlClassName="ll:w-36"
            >
              <ToggleGroup
                className="ll:ml-auto"
                type="single"
                size="xs"
                value={draft.npcLayout}
                onValueChange={(npcLayout: "tile" | "inline") => {
                  if (npcLayout) updateAndCommit({ npcLayout });
                }}
              >
                <ToggleGroupItem value="tile">
                  {t("settings.chat.npcLayout.tile")}
                </ToggleGroupItem>
                <ToggleGroupItem value="inline">
                  {t("settings.chat.npcLayout.inline")}
                </ToggleGroupItem>
              </ToggleGroup>
            </SettingsControlRow>
            <SettingsControlRow
              id="chat-font-scale"
              label={t("settings.chat.fontScale.label")}
              controlClassName="ll:w-40"
            >
              <Slider
                aria-label={t("settings.chat.fontScale.label")}
                min={CHAT_FONT_SCALE_MIN_PERCENT}
                max={CHAT_FONT_SCALE_MAX_PERCENT}
                step={5}
                value={[draft.fontScalePercent]}
                formatValue={(value) => `${value}%`}
                formatEndpoint={(value) => `${value}%`}
                onValueChange={([fontScalePercent]) =>
                  updateDraft({ fontScalePercent })
                }
                onValueCommit={([fontScalePercent]) =>
                  commit({ fontScalePercent })
                }
              />
            </SettingsControlRow>
            <SettingsControlRow
              id="chat-message-gap"
              label={t("settings.chat.messageGap.label")}
              controlClassName="ll:w-40"
            >
              <Slider
                aria-label={t("settings.chat.messageGap.label")}
                min={CHAT_MESSAGE_GAP_MIN_PX}
                max={CHAT_MESSAGE_GAP_MAX_PX}
                value={[draft.messageGapPx]}
                formatValue={(value) => `${value}px`}
                formatEndpoint={(value) => `${value}px`}
                onValueChange={([messageGapPx]) =>
                  updateDraft({ messageGapPx })
                }
                onValueCommit={([messageGapPx]) => commit({ messageGapPx })}
              />
            </SettingsControlRow>
          </SettingsSection>

          <SettingsSection title={t("settings.chat.metadata.title")}>
            {visibleMetadataKeys.map((key) => (
              <SettingsControlRow
                key={key}
                id={`chat-${key}`}
                label={t(`settings.chat.metadata.${key}`)}
              >
                <Switch
                  aria-label={t(`settings.chat.metadata.${key}`)}
                  checked={draft[key]}
                  onCheckedChange={(checked) =>
                    updateAndCommit({ [key]: checked })
                  }
                />
              </SettingsControlRow>
            ))}
            <SettingsControlRow
              id="chat-showNpcLocationAndCoordinates"
              label={t("settings.chat.metadata.showNpcLocationAndCoordinates")}
            >
              <Switch
                aria-label={t(
                  "settings.chat.metadata.showNpcLocationAndCoordinates",
                )}
                checked={draft.showNpcLocationAndCoordinates}
                onCheckedChange={(checked) =>
                  updateAndCommit({
                    showNpcLocationAndCoordinates: checked,
                  })
                }
              />
            </SettingsControlRow>
          </SettingsSection>
        </div>
      </section>

      <div
        className="ll:text-right ll:text-[10px] ll:text-gray-400"
        aria-live="polite"
      >
        {saving
          ? t("settings.chat.save.saving")
          : t("settings.chat.save.saved")}
      </div>
    </div>
  );
};
