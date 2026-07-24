import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import {
  getChatAppearanceFromSettingsDocuments,
  updateChatAppearanceInSettingsDocuments,
  useAppearanceSettingsDocuments,
} from "@/hooks/api/use-settings-documents";
import {
  CHAT_APPEARANCE_COMPACT_PRESET,
  CHAT_APPEARANCE_READABLE_PRESET,
  CHAT_FONT_SCALE_MAX_PERCENT,
  CHAT_FONT_SCALE_MIN_PERCENT,
  CHAT_MESSAGE_GAP_MAX_PX,
  CHAT_MESSAGE_GAP_MIN_PX,
  getChatAppearancePreset,
  type ChatAppearanceSettings,
  type SettingsScope,
  type SettingsScopeType,
  type SettingsValueSource,
} from "@lootlog/types";
import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  settingsDocumentsControllerPatchPreferences,
} from "@lootlog/api-client/react-query/main/preferences";
import { getUsersControllerGetUserPreferencesQueryKey } from "@lootlog/api-client/react-query/main/users";
import type { UserPreferencesResponseDtoOutput } from "@lootlog/api-client/models/main/user-preferences-response-dto-output";
import type { SettingsDocumentsResponseDtoOutput } from "@lootlog/api-client/models/main/settings-documents-response-dto-output";
import { ChatAppearancePreview } from "./chat-appearance-preview";
import { SettingsHelpPopover } from "../shared/settings-help-popover";

const METADATA_KEYS = [
  "showTimestamp",
  "showGuildLabel",
  "showNpcAvatar",
  "showNpcLevel",
  "showNpcLocation",
  "showNpcCoordinates",
] as const;

const hasPath = (value: unknown, path: string) => {
  let currentValue = value;

  for (const segment of path.split(".")) {
    if (
      typeof currentValue !== "object" ||
      currentValue === null ||
      Array.isArray(currentValue) ||
      !(segment in currentValue)
    ) {
      return false;
    }
    currentValue = (currentValue as Record<string, unknown>)[segment];
  }

  return true;
};

const getAvailableScopes = (
  userId: string | undefined,
  gameAccountId: string | undefined,
  characterId: string | undefined,
): SettingsScope[] => [
  ...(userId ? [{ type: "USER" as const, id: userId }] : []),
  ...(gameAccountId
    ? [{ type: "GAME_ACCOUNT" as const, id: gameAccountId }]
    : []),
  ...(characterId ? [{ type: "CHARACTER" as const, id: characterId }] : []),
];

export const ChatAppearanceSettingsForm = () => {
  const { t } = useTranslation();
  const preferences = useUserPreferences();
  const settingsDocuments = useAppearanceSettingsDocuments();
  const queryClient = useQueryClient();
  const [selectedScopeType, setSelectedScopeType] = useState<
    SettingsScopeType | undefined
  >();
  const [draft, setDraft] = useState<ChatAppearanceSettings>(
    CHAT_APPEARANCE_READABLE_PRESET,
  );
  const mutationQueue = useRef(Promise.resolve());
  const queueFailed = useRef(false);
  const queueGeneration = useRef(0);
  const pendingMutations = useRef(0);
  const latestDraft = useRef<ChatAppearanceSettings>(
    CHAT_APPEARANCE_READABLE_PRESET,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settingsDocuments.data) {
      const nextChatAppearance = getChatAppearanceFromSettingsDocuments(
        settingsDocuments.data,
      );
      setDraft(nextChatAppearance);
      latestDraft.current = nextChatAppearance;
      queueFailed.current = false;
    }
  }, [settingsDocuments.data]);

  const userId = preferences.data?.userId;
  const { gameAccountId, characterId } = settingsDocuments.params;
  const availableScopes = getAvailableScopes(
    userId,
    gameAccountId,
    characterId,
  );
  const selectedScope = availableScopes.find(
    (scope) => scope.type === selectedScopeType,
  );

  useEffect(() => {
    const nextAvailableScopes = getAvailableScopes(
      userId,
      gameAccountId,
      characterId,
    );
    if (
      selectedScopeType &&
      nextAvailableScopes.some((scope) => scope.type === selectedScopeType)
    ) {
      return;
    }

    setSelectedScopeType(
      nextAvailableScopes[nextAvailableScopes.length - 1]?.type,
    );
  }, [characterId, gameAccountId, selectedScopeType, userId]);

  const commit = (
    patch: Partial<ChatAppearanceSettings>,
    unset: string[] = [],
  ) => {
    if (queueFailed.current || !selectedScope) {
      return;
    }

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
                  scope: selectedScope,
                  set: Object.keys(patch).length > 0 ? { chat: patch } : {},
                  unset,
                },
              ],
            });
          let nextChatAppearance: unknown = latestDraft.current;
          if (unset.length > 0 || pendingMutations.current === 1) {
            nextChatAppearance =
              updatedSettingsDocuments.domains.appearance?.effective.chat ??
              CHAT_APPEARANCE_READABLE_PRESET;
          }
          const normalizedNextChatAppearance = {
            ...CHAT_APPEARANCE_READABLE_PRESET,
            ...(nextChatAppearance as Partial<ChatAppearanceSettings>),
          };
          queryClient.setQueryData<SettingsDocumentsResponseDtoOutput>(
            getSettingsDocumentsControllerGetPreferencesQueryKey(
              settingsDocuments.params,
            ),
            pendingMutations.current === 1
              ? updatedSettingsDocuments
              : updateChatAppearanceInSettingsDocuments(
                  updatedSettingsDocuments,
                  latestDraft.current,
                ),
          );
          queryClient.setQueryData<UserPreferencesResponseDtoOutput>(
            getUsersControllerGetUserPreferencesQueryKey(),
            (currentPreferences) =>
              currentPreferences
                ? {
                    ...currentPreferences,
                    chatAppearance: normalizedNextChatAppearance,
                  }
                : currentPreferences,
          );
          if (unset.length > 0) {
            setDraft(normalizedNextChatAppearance);
            latestDraft.current = normalizedNextChatAppearance;
          }
        } catch {
          queueFailed.current = true;
          queueGeneration.current += 1;
          await Promise.all([
            preferences.refetch(),
            settingsDocuments.refetch(),
          ]);
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

  const updateDraft = (patch: Partial<ChatAppearanceSettings>) => {
    setDraft((currentDraft) => {
      const nextDraft = { ...currentDraft, ...patch };
      latestDraft.current = nextDraft;
      return nextDraft;
    });
    queryClient.setQueryData<UserPreferencesResponseDtoOutput>(
      getUsersControllerGetUserPreferencesQueryKey(),
      (currentPreferences) =>
        currentPreferences
          ? {
              ...currentPreferences,
              chatAppearance: {
                ...currentPreferences.chatAppearance,
                ...patch,
              },
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
          patch,
        ),
    );
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
  const appearanceResolution = settingsDocuments.data?.domains.appearance;

  const getSourceLabel = (source: SettingsValueSource | undefined) => {
    if (!source || source === "DEFAULT") {
      return t("settings.inheritance.default");
    }

    return t(`settings.inheritance.sources.${source.type}`);
  };

  const renderInheritanceStatus = (path: string) => {
    const source = appearanceResolution?.sources[path] as
      | SettingsValueSource
      | undefined;
    const selectedLayer = appearanceResolution?.layers.find(
      (layer) =>
        layer.scope.type === selectedScope?.type &&
        layer.scope.id === selectedScope?.id,
    );
    const overriddenHere = hasPath(selectedLayer?.overrides, path);

    return (
      <div className="ll:flex ll:items-center ll:justify-end ll:gap-1 ll:text-[9px] ll:text-gray-400">
        <span>
          {overriddenHere
            ? t("settings.inheritance.overridden")
            : t("settings.inheritance.inherited", {
                source: getSourceLabel(source),
              })}
        </span>
        {overriddenHere ? (
          <Button
            type="button"
            variant="ghost"
            className="ll:h-4 ll:px-1 ll:text-[9px]"
            onClick={() => commit({}, [path])}
          >
            {t("settings.inheritance.clear")}
          </Button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="ll:grid ll:grid-cols-1 ll:gap-3 min-[680px]:ll:grid-cols-[minmax(0,1fr)_220px]">
      <div className="ll:order-2 ll:flex ll:min-w-0 ll:flex-col ll:gap-3 min-[680px]:ll:order-1">
        {availableScopes.length > 1 ? (
          <SettingsSection title={t("settings.inheritance.scopeTitle")}>
            <SettingsControlRow
              id="chat-settings-scope"
              label={t("settings.inheritance.scopeLabel")}
            >
              <ToggleGroup
                type="single"
                size="xs"
                value={selectedScopeType}
                onValueChange={(value: SettingsScopeType) => {
                  if (value) {
                    setSelectedScopeType(value);
                  }
                }}
              >
                {availableScopes.map((scope) => (
                  <ToggleGroupItem key={scope.type} value={scope.type}>
                    {t(`settings.inheritance.scopes.${scope.type}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </SettingsControlRow>
          </SettingsSection>
        ) : null}
        <SettingsSection
          title={t("settings.chat.preset.section")}
          actions={
            <Button variant="ghost" onClick={() => applyPreset("readable")}>
              <RotateCcw className="ll:size-3.5" />
              {t("settings.chat.reset")}
            </Button>
          }
        >
          <SettingsControlRow
            id="chat-preset"
            label={t("settings.chat.preset.label")}
            controlClassName="ll:w-44"
          >
            <div className="ll:flex ll:flex-col ll:items-end ll:gap-1">
              <ToggleGroup
                type="single"
                size="xs"
                value={activePreset === "custom" ? undefined : activePreset}
                onValueChange={(value: "readable" | "compact") => {
                  if (value) {
                    applyPreset(value);
                  }
                }}
              >
                <ToggleGroupItem value="readable">
                  {t("settings.chat.preset.readable")}
                </ToggleGroupItem>
                <ToggleGroupItem value="compact">
                  {t("settings.chat.preset.compact")}
                </ToggleGroupItem>
              </ToggleGroup>
              {activePreset === "custom" ? (
                <span className="ll:text-[10px] ll:font-semibold ll:text-purple-300">
                  {t("settings.chat.preset.custom")}
                </span>
              ) : null}
            </div>
          </SettingsControlRow>
        </SettingsSection>
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
            <div className="ll:flex ll:flex-col ll:items-end ll:gap-1">
              <ToggleGroup
                type="single"
                size="xs"
                value={draft.npcLayout}
                onValueChange={(npcLayout: "tile" | "inline") => {
                  if (!npcLayout) {
                    return;
                  }
                  updateDraft({ npcLayout });
                  commit({ npcLayout });
                }}
              >
                <ToggleGroupItem value="tile">
                  {t("settings.chat.npcLayout.tile")}
                </ToggleGroupItem>
                <ToggleGroupItem value="inline">
                  {t("settings.chat.npcLayout.inline")}
                </ToggleGroupItem>
              </ToggleGroup>
              {renderInheritanceStatus("chat.npcLayout")}
            </div>
          </SettingsControlRow>
          <SettingsControlRow
            id="chat-font-scale"
            label={t("settings.chat.fontScale.label")}
            controlClassName="ll:w-40"
          >
            <div className="ll:flex ll:flex-col ll:items-end ll:gap-1">
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
              {renderInheritanceStatus("chat.fontScalePercent")}
            </div>
          </SettingsControlRow>
          <SettingsControlRow
            id="chat-message-gap"
            label={t("settings.chat.messageGap.label")}
            controlClassName="ll:w-40"
          >
            <div className="ll:flex ll:flex-col ll:items-end ll:gap-1">
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
              {renderInheritanceStatus("chat.messageGapPx")}
            </div>
          </SettingsControlRow>
        </SettingsSection>
        <SettingsSection title={t("settings.chat.metadata.title")}>
          {METADATA_KEYS.map((key) => (
            <SettingsControlRow
              key={key}
              id={`chat-${key}`}
              label={t(`settings.chat.metadata.${key}`)}
            >
              <div className="ll:flex ll:flex-col ll:items-end ll:gap-1">
                <Switch
                  checked={draft[key]}
                  onCheckedChange={(checked) => {
                    updateDraft({ [key]: checked });
                    commit({ [key]: checked });
                  }}
                />
                {renderInheritanceStatus(`chat.${key}`)}
              </div>
            </SettingsControlRow>
          ))}
        </SettingsSection>
        <div
          className="ll:text-right ll:text-[10px] ll:text-gray-400"
          aria-live="polite"
        >
          {saving
            ? t("settings.chat.save.saving")
            : t("settings.chat.save.saved")}
        </div>
      </div>
      <div className="ll:order-1 min-[680px]:ll:order-2 min-[680px]:ll:pt-5">
        <div className="min-[680px]:ll:sticky min-[680px]:ll:top-2">
          <ChatAppearancePreview settings={draft} />
        </div>
      </div>
    </div>
  );
};
